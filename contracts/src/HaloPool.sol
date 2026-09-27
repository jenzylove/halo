// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

interface IERC3009Receive {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @title HaloPool
/// @notice Purchase protection for AI agents paying in USDC.
/// Users sign a mandate before their agent shops. Halo approves purchases that fit the mandate,
/// charges a fee into this pool, and pays the user back from the pool when a covered purchase goes wrong.
/// Merchants post bonds that are slashed back into the pool when a claim is their fault.
contract HaloPool is Ownable, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Approved, // checked and approved, fee not yet paid
        Covered, // fee paid, guarantee active until coveredUntil
        Claimed, // claim filed, waiting for a verdict
        Resolved, // claim resolved (paid or rejected)
        Released // expired without a claim, capacity freed
    }

    struct Mandate {
        address user;
        bytes32 termsHash;
        uint128 maxTotal;
        uint128 spent;
        uint64 expiry;
    }

    struct Approval {
        bytes32 mandateId;
        address merchant;
        uint128 amount;
        uint128 fee;
        uint64 deadline; // pay fee before this while Approved; claim before this while Covered
        Status status;
    }

    struct Merchant {
        uint128 bond;
        uint64 unlockAt;
        bool verified;
    }

    struct Params {
        uint16 feeBps; // fee in basis points of the purchase
        uint64 minFee; // minimum fee, token units
        uint16 leverage; // open coverage may not exceed pool balance times this
        uint64 claimCap; // max payout per claim
        uint64 userCap; // max payout per user per 30 days
        uint64 newUserCap; // max purchase size during the new user period
        uint32 newUserPeriod; // seconds
        uint32 feeWindow; // seconds to pay the fee after approval
        uint32 claimWindow; // seconds a covered purchase stays claimable
        uint32 unbondDelay; // seconds between an unbond request and withdrawal
    }

    bytes32 public constant MANDATE_TYPEHASH =
        keccak256("Mandate(bytes32 id,bytes32 termsHash,uint128 maxTotal,uint64 expiry)");

    IERC20 public immutable usdc;
    address public operator;
    Params public params;

    mapping(bytes32 => Mandate) public mandates;
    mapping(bytes32 => Approval) public approvals;
    mapping(address => Merchant) public merchants;
    mapping(address => uint64) public firstSeen;
    mapping(address => uint64) public capWindowStart;
    mapping(address => uint128) public paidInWindow;

    uint256 public openCoverage;
    uint256 public totalBonds;

    event OperatorSet(address operator);
    event ParamsSet(Params params);
    event PoolFunded(address indexed from, uint256 amount);
    event MandateRegistered(bytes32 indexed mandateId, address indexed user, bytes32 termsHash, uint128 maxTotal, uint64 expiry);
    event ApprovalRecorded(bytes32 indexed approvalId, bytes32 indexed mandateId, address indexed merchant, uint128 amount, uint128 fee);
    event FeePaid(bytes32 indexed approvalId, address indexed user, uint128 fee, uint64 coveredUntil);
    event PaymentLinked(bytes32 indexed approvalId, bytes32 paymentRef, bytes32 deliveryHash);
    event ClaimFiled(bytes32 indexed approvalId, address indexed filer, bytes32 evidenceHash);
    event ClaimResolved(bytes32 indexed approvalId, address indexed user, uint128 payout, bytes32 verdictHash, bool merchantFault, uint128 slashed);
    event Released(bytes32 indexed approvalId);
    event MerchantVerified(address indexed merchant, bool verified);
    event BondDeposited(address indexed merchant, address indexed from, uint128 amount);
    event BondSlashed(address indexed merchant, bytes32 indexed approvalId, uint128 amount);
    event UnbondRequested(address indexed merchant, uint64 unlockAt);
    event BondWithdrawn(address indexed merchant, uint128 amount);

    error NotOperator();
    error BadSignature();
    error MandateExists();
    error UnknownMandate();
    error MandateExpired();
    error OverBudget();
    error ApprovalExists();
    error NewUserLimit();
    error OverLeverage();
    error WrongStatus();
    error TooLate();
    error TooEarly();
    error NotUser();
    error InsufficientPool();
    error BondLocked();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(IERC20 usdc_, address operator_, Params memory params_) Ownable(msg.sender) EIP712("HaloPool", "1") {
        usdc = usdc_;
        operator = operator_;
        params = params_;
        emit OperatorSet(operator_);
        emit ParamsSet(params_);
    }

    // ---------- views ----------

    /// @notice Capital available to pay claims: token balance minus merchant bonds held in escrow.
    function poolBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this)) - totalBonds;
    }

    function capacity() public view returns (uint256) {
        uint256 limit = poolBalance() * params.leverage;
        return limit > openCoverage ? limit - openCoverage : 0;
    }

    function mandateDigest(bytes32 id, bytes32 termsHash, uint128 maxTotal, uint64 expiry) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(MANDATE_TYPEHASH, id, termsHash, maxTotal, expiry)));
    }

    function feeFor(uint128 amount) public view returns (uint128) {
        uint256 fee = (uint256(amount) * params.feeBps) / 10_000;
        if (fee < params.minFee) fee = params.minFee;
        return uint128(fee);
    }

    // ---------- admin ----------

    function setOperator(address operator_) external onlyOwner {
        operator = operator_;
        emit OperatorSet(operator_);
    }

    function setParams(Params calldata params_) external onlyOwner {
        params = params_;
        emit ParamsSet(params_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fund(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount);
    }

    // ---------- mandates ----------

    /// @notice Lock a user's mandate onchain before their agent acts. The user signs, the operator submits (user needs no gas).
    function registerMandate(
        bytes32 id,
        address user,
        bytes32 termsHash,
        uint128 maxTotal,
        uint64 expiry,
        bytes calldata userSig
    ) external onlyOperator whenNotPaused {
        if (mandates[id].user != address(0)) revert MandateExists();
        if (expiry <= block.timestamp) revert MandateExpired();
        if (!SignatureChecker.isValidSignatureNow(user, mandateDigest(id, termsHash, maxTotal, expiry), userSig)) {
            revert BadSignature();
        }
        mandates[id] = Mandate(user, termsHash, maxTotal, 0, expiry);
        if (firstSeen[user] == 0) firstSeen[user] = uint64(block.timestamp);
        emit MandateRegistered(id, user, termsHash, maxTotal, expiry);
    }

    // ---------- approvals ----------

    function recordApproval(bytes32 approvalId, bytes32 mandateId, address merchant, uint128 amount)
        external
        onlyOperator
        whenNotPaused
    {
        if (approvals[approvalId].status != Status.None) revert ApprovalExists();
        Mandate storage m = mandates[mandateId];
        if (m.user == address(0)) revert UnknownMandate();
        if (m.expiry <= block.timestamp) revert MandateExpired();
        if (uint256(m.spent) + amount > m.maxTotal) revert OverBudget();
        if (block.timestamp < uint256(firstSeen[m.user]) + params.newUserPeriod && amount > params.newUserCap) {
            revert NewUserLimit();
        }
        if (openCoverage + amount > poolBalance() * params.leverage) revert OverLeverage();

        uint128 fee = feeFor(amount);
        m.spent += amount;
        openCoverage += amount;
        approvals[approvalId] =
            Approval(mandateId, merchant, amount, fee, uint64(block.timestamp + params.feeWindow), Status.Approved);
        emit ApprovalRecorded(approvalId, mandateId, merchant, amount, fee);
    }

    /// @notice Pay the fee with an EIP-3009 authorization signed by the user, so the user needs no gas.
    function payFeeWithAuthorization(
        bytes32 approvalId,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused nonReentrant {
        (Approval storage a, address user) = _approvedForFee(approvalId);
        IERC3009Receive(address(usdc)).receiveWithAuthorization(
            user, address(this), a.fee, validAfter, validBefore, nonce, v, r, s
        );
        _activate(approvalId, a, user);
    }

    /// @notice Pay the fee with a plain transferFrom (user approved the pool beforehand).
    function payFee(bytes32 approvalId) external whenNotPaused nonReentrant {
        (Approval storage a, address user) = _approvedForFee(approvalId);
        if (msg.sender != user) revert NotUser();
        usdc.safeTransferFrom(user, address(this), a.fee);
        _activate(approvalId, a, user);
    }

    function linkPayment(bytes32 approvalId, bytes32 paymentRef, bytes32 deliveryHash) external onlyOperator {
        Status st = approvals[approvalId].status;
        if (st != Status.Covered && st != Status.Claimed) revert WrongStatus();
        emit PaymentLinked(approvalId, paymentRef, deliveryHash);
    }

    // ---------- claims ----------

    function fileClaim(bytes32 approvalId, bytes32 evidenceHash) external whenNotPaused {
        Approval storage a = approvals[approvalId];
        if (a.status != Status.Covered) revert WrongStatus();
        if (block.timestamp > a.deadline) revert TooLate();
        address user = mandates[a.mandateId].user;
        if (msg.sender != user && msg.sender != operator) revert NotUser();
        a.status = Status.Claimed;
        emit ClaimFiled(approvalId, msg.sender, evidenceHash);
    }

    /// @notice Settle a claim. Payout is clamped to the purchase amount, the per claim cap and the user's 30 day cap.
    /// When the merchant is at fault, its bond pays the pool back first.
    function resolveClaim(bytes32 approvalId, uint128 payout, bytes32 verdictHash, bool merchantFault)
        external
        onlyOperator
        nonReentrant
    {
        Approval storage a = approvals[approvalId];
        if (a.status != Status.Claimed) revert WrongStatus();
        address user = mandates[a.mandateId].user;

        if (payout > a.amount) payout = a.amount;
        if (payout > params.claimCap) payout = params.claimCap;
        if (block.timestamp >= uint256(capWindowStart[user]) + 30 days) {
            capWindowStart[user] = uint64(block.timestamp);
            paidInWindow[user] = 0;
        }
        uint128 room = params.userCap > paidInWindow[user] ? uint128(params.userCap - paidInWindow[user]) : 0;
        if (payout > room) payout = room;

        uint128 slashed;
        if (merchantFault && payout > 0) {
            Merchant storage mer = merchants[a.merchant];
            slashed = payout < mer.bond ? payout : mer.bond;
            if (slashed > 0) {
                mer.bond -= slashed;
                totalBonds -= slashed;
                emit BondSlashed(a.merchant, approvalId, slashed);
            }
        }

        a.status = Status.Resolved;
        openCoverage -= a.amount;

        if (payout > 0) {
            if (poolBalance() < payout) revert InsufficientPool();
            paidInWindow[user] += payout;
            usdc.safeTransfer(user, payout);
        }
        emit ClaimResolved(approvalId, user, payout, verdictHash, merchantFault, slashed);
    }

    /// @notice Free capacity for approvals whose fee was never paid or whose claim window has passed. Anyone can call.
    function release(bytes32 approvalId) external {
        Approval storage a = approvals[approvalId];
        if (a.status != Status.Approved && a.status != Status.Covered) revert WrongStatus();
        if (block.timestamp <= a.deadline) revert TooEarly();
        if (a.status == Status.Approved) mandates[a.mandateId].spent -= a.amount;
        a.status = Status.Released;
        openCoverage -= a.amount;
        emit Released(approvalId);
    }

    // ---------- merchants ----------

    function setVerified(address merchant, bool verified) external onlyOperator {
        merchants[merchant].verified = verified;
        emit MerchantVerified(merchant, verified);
    }

    function depositBond(address merchant, uint128 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        merchants[merchant].bond += amount;
        merchants[merchant].unlockAt = 0;
        totalBonds += amount;
        emit BondDeposited(merchant, msg.sender, amount);
    }

    function requestUnbond() external {
        uint64 unlockAt = uint64(block.timestamp + params.unbondDelay);
        merchants[msg.sender].unlockAt = unlockAt;
        emit UnbondRequested(msg.sender, unlockAt);
    }

    function withdrawBond(uint128 amount) external nonReentrant {
        Merchant storage mer = merchants[msg.sender];
        if (mer.unlockAt == 0 || block.timestamp < mer.unlockAt) revert BondLocked();
        mer.bond -= amount;
        totalBonds -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit BondWithdrawn(msg.sender, amount);
    }

    // ---------- internal ----------

    function _approvedForFee(bytes32 approvalId) internal view returns (Approval storage a, address user) {
        a = approvals[approvalId];
        if (a.status != Status.Approved) revert WrongStatus();
        if (block.timestamp > a.deadline) revert TooLate();
        user = mandates[a.mandateId].user;
    }

    function _activate(bytes32 approvalId, Approval storage a, address user) internal {
        uint64 coveredUntil = uint64(block.timestamp + params.claimWindow);
        a.status = Status.Covered;
        a.deadline = coveredUntil;
        emit FeePaid(approvalId, user, a.fee, coveredUntil);
    }
}
