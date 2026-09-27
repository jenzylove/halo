// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC3009} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC3009.sol";
import {HaloPool} from "../src/HaloPool.sol";

contract MockUSDC is ERC20, EIP712, ERC3009 {
    constructor() ERC20("USD Coin", "USDC") EIP712("USD Coin", "2") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

contract HaloPoolTest is Test {
    MockUSDC usdc;
    HaloPool pool;

    address operator = makeAddr("operator");
    address merchant = makeAddr("merchant");
    address stranger = makeAddr("stranger");
    uint256 userKey = 0xA11CE;
    address user;

    uint128 constant D = 1e6; // one dollar

    function setUp() public {
        user = vm.addr(userKey);
        usdc = new MockUSDC();
        pool = new HaloPool(usdc, operator, _params());
        usdc.mint(address(this), 10_000 * D);
        usdc.approve(address(pool), type(uint256).max);
        pool.fund(1_000 * D);
        usdc.mint(user, 1_000 * D);
        vm.warp(1_000_000);
    }

    function _params() internal pure returns (HaloPool.Params memory) {
        return HaloPool.Params({
            feeBps: 100,
            minFee: uint64(2 * D / 100),
            leverage: 20,
            claimCap: uint64(250 * D),
            userCap: uint64(500 * D),
            newUserCap: uint64(50 * D),
            newUserPeriod: 7 days,
            feeWindow: 1 hours,
            claimWindow: 7 days,
            unbondDelay: 7 days
        });
    }

    // ---------- helpers ----------

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _mandate(bytes32 id, uint128 maxTotal) internal {
        uint64 expiry = uint64(block.timestamp + 1 days);
        bytes32 terms = keccak256("2 tickets, Oct 12, under 100 each");
        bytes memory sig = _sign(userKey, pool.mandateDigest(id, terms, maxTotal, expiry));
        vm.prank(operator);
        pool.registerMandate(id, user, terms, maxTotal, expiry, sig);
    }

    function _approve(bytes32 aid, bytes32 mid, uint128 amount) internal {
        vm.prank(operator);
        pool.recordApproval(aid, mid, merchant, amount);
    }

    function _payFeeAuth(bytes32 aid) internal {
        (,, , uint128 fee,,) = pool.approvals(aid);
        bytes32 nonce = keccak256(abi.encode(aid));
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
                ),
                user,
                address(pool),
                uint256(fee),
                uint256(0),
                block.timestamp + 1 hours,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, digest);
        pool.payFeeWithAuthorization(aid, 0, block.timestamp + 1 hours, nonce, v, r, s);
    }

    function _covered(bytes32 aid, uint128 amount) internal {
        bytes32 mid = keccak256(abi.encode("m", aid));
        _mandate(mid, amount);
        _approve(aid, mid, amount);
        _payFeeAuth(aid);
    }

    /// @dev Make the user an existing customer: first seen more than the new user period ago.
    function _season() internal {
        _mandate("season", 1 * D);
        vm.warp(block.timestamp + 8 days);
    }

    function _status(bytes32 aid) internal view returns (HaloPool.Status st) {
        (,,,,, st) = pool.approvals(aid);
    }

    // ---------- mandates ----------

    function test_registerMandate() public {
        _mandate("m1", 200 * D);
        (address u,, uint128 maxTotal,,) = pool.mandates("m1");
        assertEq(u, user);
        assertEq(maxTotal, 200 * D);
    }

    function test_registerMandate_badSignature() public {
        uint64 expiry = uint64(block.timestamp + 1 days);
        bytes memory sig = _sign(0xB0B, pool.mandateDigest("m1", bytes32(0), 200 * D, expiry));
        vm.prank(operator);
        vm.expectRevert(HaloPool.BadSignature.selector);
        pool.registerMandate("m1", user, bytes32(0), 200 * D, expiry, sig);
    }

    function test_registerMandate_signatureBindsTerms() public {
        uint64 expiry = uint64(block.timestamp + 1 days);
        bytes memory sig = _sign(userKey, pool.mandateDigest("m1", keccak256("a"), 200 * D, expiry));
        vm.prank(operator);
        vm.expectRevert(HaloPool.BadSignature.selector);
        pool.registerMandate("m1", user, keccak256("b"), 200 * D, expiry, sig);
    }

    function test_registerMandate_onlyOperator() public {
        vm.prank(stranger);
        vm.expectRevert(HaloPool.NotOperator.selector);
        pool.registerMandate("m1", user, bytes32(0), 1, uint64(block.timestamp + 1), "");
    }

    // ---------- approvals ----------

    function test_approval_happyPath() public {
        _season();
        _mandate("m1", 200 * D);
        _approve("a1", "m1", 190 * D);
        (, address mer, uint128 amount, uint128 fee,, HaloPool.Status st) = pool.approvals("a1");
        assertEq(mer, merchant);
        assertEq(amount, 190 * D);
        assertEq(fee, 19 * D / 10); // 1%
        assertEq(uint8(st), uint8(HaloPool.Status.Approved));
        assertEq(pool.openCoverage(), 190 * D);
    }

    function test_approval_minFee() public {
        _mandate("m1", 200 * D);
        _approve("a1", "m1", 1 * D);
        (,,, uint128 fee,,) = pool.approvals("a1");
        assertEq(fee, 2 * D / 100);
    }

    function test_approval_overBudget() public {
        _season();
        _mandate("m1", 200 * D);
        _approve("a1", "m1", 150 * D);
        vm.prank(operator);
        vm.expectRevert(HaloPool.OverBudget.selector);
        pool.recordApproval("a2", "m1", merchant, 60 * D);
    }

    function test_approval_expiredMandate() public {
        _mandate("m1", 200 * D);
        vm.warp(block.timestamp + 2 days);
        vm.prank(operator);
        vm.expectRevert(HaloPool.MandateExpired.selector);
        pool.recordApproval("a1", "m1", merchant, 10 * D);
    }

    function test_approval_newUserLimit() public {
        _mandate("m1", 200 * D);
        vm.prank(operator);
        vm.expectRevert(HaloPool.NewUserLimit.selector);
        pool.recordApproval("a1", "m1", merchant, 60 * D);
        vm.warp(block.timestamp + 7 days + 1);
        // mandate expired by now, register a fresh one
        _mandate("m2", 200 * D);
        _approve("a1", "m2", 60 * D);
    }

    function test_approval_overLeverage() public {
        // pool 1,000 at leverage 20 = 20,000 capacity
        _season();
        _mandate("m1", 30_000 * D);
        _approve("a1", "m1", 20_000 * D);
        vm.prank(operator);
        vm.expectRevert(HaloPool.OverLeverage.selector);
        pool.recordApproval("a2", "m1", merchant, 1 * D);
    }

    function test_approval_onlyOperator() public {
        _mandate("m1", 200 * D);
        vm.prank(stranger);
        vm.expectRevert(HaloPool.NotOperator.selector);
        pool.recordApproval("a1", "m1", merchant, 10 * D);
    }

    function test_approval_pausedBlocks() public {
        _mandate("m1", 200 * D);
        pool.pause();
        vm.prank(operator);
        vm.expectRevert();
        pool.recordApproval("a1", "m1", merchant, 10 * D);
    }

    // ---------- fees ----------

    function test_payFeeWithAuthorization_activatesCoverage() public {
        uint256 before = pool.poolBalance();
        _covered("a1", 40 * D);
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Covered));
        assertEq(pool.poolBalance(), before + 40 * D / 100);
    }

    function test_payFee_plain() public {
        _mandate("m1", 40 * D);
        _approve("a1", "m1", 40 * D);
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        pool.payFee("a1");
        vm.stopPrank();
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Covered));
    }

    function test_payFee_afterWindowFails() public {
        _mandate("m1", 40 * D);
        _approve("a1", "m1", 40 * D);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(user);
        vm.expectRevert(HaloPool.TooLate.selector);
        pool.payFee("a1");
    }

    // ---------- claims ----------

    function test_claim_paysUser() public {
        _covered("a1", 40 * D);
        vm.prank(user);
        pool.fileClaim("a1", keccak256("wrong date"));
        uint256 before = usdc.balanceOf(user);
        vm.prank(operator);
        pool.resolveClaim("a1", 40 * D, keccak256("verdict"), false);
        assertEq(usdc.balanceOf(user), before + 40 * D);
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Resolved));
        assertEq(pool.openCoverage(), 0);
    }

    function test_claim_operatorCanFileAutomatically() public {
        _covered("a1", 40 * D);
        vm.prank(operator);
        pool.fileClaim("a1", keccak256("auto: delivery mismatch"));
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Claimed));
    }

    function test_claim_strangerCannotFile() public {
        _covered("a1", 40 * D);
        vm.prank(stranger);
        vm.expectRevert(HaloPool.NotUser.selector);
        pool.fileClaim("a1", bytes32(0));
    }

    function test_claim_afterWindowFails() public {
        _covered("a1", 40 * D);
        vm.warp(block.timestamp + 8 days);
        vm.prank(user);
        vm.expectRevert(HaloPool.TooLate.selector);
        pool.fileClaim("a1", bytes32(0));
    }

    function test_claim_uncoveredFails() public {
        _mandate("m1", 40 * D);
        _approve("a1", "m1", 40 * D);
        vm.prank(user);
        vm.expectRevert(HaloPool.WrongStatus.selector);
        pool.fileClaim("a1", bytes32(0));
    }

    function test_claim_clampedToClaimCap() public {
        _season();
        _covered("a1", 400 * D);
        vm.prank(user);
        pool.fileClaim("a1", bytes32(0));
        uint256 before = usdc.balanceOf(user);
        vm.prank(operator);
        pool.resolveClaim("a1", 400 * D, bytes32(0), false);
        assertEq(usdc.balanceOf(user), before + 250 * D);
    }

    function test_claim_userMonthlyCap() public {
        _season();
        uint256 before = usdc.balanceOf(user);
        for (uint256 i; i < 3; i++) {
            bytes32 aid = keccak256(abi.encode(i));
            _covered(aid, 200 * D);
            vm.prank(user);
            pool.fileClaim(aid, bytes32(0));
            vm.prank(operator);
            pool.resolveClaim(aid, 200 * D, bytes32(0), false);
        }
        uint256 fees = 3 * (200 * D / 100);
        assertEq(usdc.balanceOf(user), before - fees + 500 * D); // 200 + 200 + 100
    }

    function test_claim_merchantFaultSlashesBond() public {
        pool.depositBond(merchant, 100 * D);
        _covered("a1", 40 * D);
        vm.prank(user);
        pool.fileClaim("a1", bytes32(0));
        uint256 poolBefore = pool.poolBalance();
        vm.prank(operator);
        pool.resolveClaim("a1", 40 * D, bytes32(0), true);
        (uint128 bond,,) = pool.merchants(merchant);
        assertEq(bond, 60 * D);
        assertEq(pool.totalBonds(), 60 * D);
        // slashed 40 moved into pool capital, then 40 paid out: pool unchanged
        assertEq(pool.poolBalance(), poolBefore);
    }

    function test_claim_rejectedPaysNothing() public {
        _covered("a1", 40 * D);
        vm.prank(user);
        pool.fileClaim("a1", bytes32(0));
        uint256 before = usdc.balanceOf(user);
        vm.prank(operator);
        pool.resolveClaim("a1", 0, keccak256("not covered"), false);
        assertEq(usdc.balanceOf(user), before);
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Resolved));
    }

    function test_claim_onlyOperatorResolves() public {
        _covered("a1", 40 * D);
        vm.prank(user);
        pool.fileClaim("a1", bytes32(0));
        vm.prank(user);
        vm.expectRevert(HaloPool.NotOperator.selector);
        pool.resolveClaim("a1", 40 * D, bytes32(0), false);
    }

    // ---------- release ----------

    function test_release_unpaidRestoresBudget() public {
        _mandate("m1", 40 * D);
        _approve("a1", "m1", 40 * D);
        vm.expectRevert(HaloPool.TooEarly.selector);
        pool.release("a1");
        vm.warp(block.timestamp + 2 hours);
        pool.release("a1");
        (,,, uint128 spent,) = pool.mandates("m1");
        assertEq(spent, 0);
        assertEq(pool.openCoverage(), 0);
    }

    function test_release_afterClaimWindow() public {
        _covered("a1", 40 * D);
        vm.warp(block.timestamp + 8 days);
        pool.release("a1");
        assertEq(pool.openCoverage(), 0);
        assertEq(uint8(_status("a1")), uint8(HaloPool.Status.Released));
    }

    // ---------- bonds ----------

    function test_bond_lockedUntilUnbondDelay() public {
        pool.depositBond(merchant, 100 * D);
        vm.prank(merchant);
        vm.expectRevert(HaloPool.BondLocked.selector);
        pool.withdrawBond(100 * D);
        vm.prank(merchant);
        pool.requestUnbond();
        vm.warp(block.timestamp + 7 days);
        vm.prank(merchant);
        pool.withdrawBond(100 * D);
        assertEq(usdc.balanceOf(merchant), 100 * D);
        assertEq(pool.totalBonds(), 0);
    }

    function test_bondsNotCountedAsPoolCapital() public {
        uint256 before = pool.poolBalance();
        pool.depositBond(merchant, 100 * D);
        assertEq(pool.poolBalance(), before);
    }
}
