// Generated from contracts/out by forge build. Do not edit.
export const haloAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "usdc_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "operator_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "params_",
        "type": "tuple",
        "internalType": "struct HaloPool.Params",
        "components": [
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "minFee",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "leverage",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "claimCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "userCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserPeriod",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "feeWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "claimWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "unbondDelay",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MANDATE_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approvals",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "mandateId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "merchant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum HaloPool.Status"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "capWindowStart",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "capacity",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "depositBond",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeFor",
    "inputs": [
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fileClaim",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "firstSeen",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fund",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "linkPayment",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "paymentRef",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deliveryHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "mandateDigest",
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "maxTotal",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mandates",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "maxTotal",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "spent",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "merchants",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "bond",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "unlockAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "verified",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openCoverage",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "operator",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paidInWindow",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "params",
    "inputs": [],
    "outputs": [
      {
        "name": "feeBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "minFee",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "leverage",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "claimCap",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "userCap",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "newUserCap",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "newUserPeriod",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "feeWindow",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "claimWindow",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "unbondDelay",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payFee",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "payFeeWithAuthorization",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "validAfter",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "validBefore",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "poolBalance",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recordApproval",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "mandateId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "merchant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerMandate",
    "inputs": [
      {
        "name": "id",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "maxTotal",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "userSig",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "release",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestUnbond",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveClaim",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "payout",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "verdictHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "merchantFault",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOperator",
    "inputs": [
      {
        "name": "operator_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setParams",
    "inputs": [
      {
        "name": "params_",
        "type": "tuple",
        "internalType": "struct HaloPool.Params",
        "components": [
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "minFee",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "leverage",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "claimCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "userCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserPeriod",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "feeWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "claimWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "unbondDelay",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setVerified",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "verified",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalBonds",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawBond",
    "inputs": [
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ApprovalRecorded",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "mandateId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BondDeposited",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BondSlashed",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BondWithdrawn",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimFiled",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "filer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimResolved",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "payout",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "verdictHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "merchantFault",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "slashed",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeePaid",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "fee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "coveredUntil",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MandateRegistered",
    "inputs": [
      {
        "name": "mandateId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "maxTotal",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "expiry",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MerchantVerified",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "verified",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorSet",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ParamsSet",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct HaloPool.Params",
        "components": [
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "minFee",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "leverage",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "claimCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "userCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserCap",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "newUserPeriod",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "feeWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "claimWindow",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "unbondDelay",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentLinked",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "paymentRef",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "deliveryHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PoolFunded",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Released",
    "inputs": [
      {
        "name": "approvalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UnbondRequested",
    "inputs": [
      {
        "name": "merchant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "unlockAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ApprovalExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BondLocked",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientPool",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MandateExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MandateExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NewUserLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOperator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotUser",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OverBudget",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OverLeverage",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooEarly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooLate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownMandate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongStatus",
    "inputs": []
  }
] as const;
