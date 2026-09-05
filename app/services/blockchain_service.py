import json
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from web3 import Web3


# Load environment variables from .env
load_dotenv()


class BlockchainService:
    def __init__(self):
        self.rpc_url = os.getenv("SEPOLIA_RPC_URL")
        self.private_key = os.getenv("WALLET_PRIVATE_KEY")
        self.wallet_address = os.getenv("WALLET_ADDRESS")
        self.contract_address = os.getenv("VERITRACE_CONTRACT_ADDRESS")

        if not self.rpc_url:
            raise ValueError("SEPOLIA_RPC_URL is missing from .env")

        if not self.private_key:
            raise ValueError("WALLET_PRIVATE_KEY is missing from .env")

        if not self.wallet_address:
            raise ValueError("WALLET_ADDRESS is missing from .env")

        if not self.contract_address:
            raise ValueError("VERITRACE_CONTRACT_ADDRESS is missing from .env")

        # Connect to Ethereum Sepolia
        self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))

        if not self.web3.is_connected():
            raise ConnectionError("Could not connect to Ethereum Sepolia")

        # Load ABI
        abi_path = (
            Path(__file__).resolve().parents[2]
            / "contracts"
            / "VeriTraceRegistryABI.json"
        )

        if not abi_path.exists():
            raise FileNotFoundError(
                f"ABI file not found: {abi_path}"
            )

        with open(abi_path, "r", encoding="utf-8") as file:
            self.abi = json.load(file)

        # Create contract instance
        self.contract = self.web3.eth.contract(
            address=Web3.to_checksum_address(self.contract_address),
            abi=self.abi,
        )

        self.wallet_address = Web3.to_checksum_address(
            self.wallet_address
        )

    def register_fingerprint(self, fingerprint_bytes32: bytes) -> Dict[str, Any]:
        """
        Register a fingerprint on the VeriTraceRegistry contract.

        Returns transaction information after confirmation.
        """

        if len(fingerprint_bytes32) != 32:
            raise ValueError("Fingerprint must be exactly 32 bytes")

        # Get current wallet nonce
        nonce = self.web3.eth.get_transaction_count(
            self.wallet_address
        )

        # Build transaction
        transaction = self.contract.functions.registerEvidence(
            fingerprint_bytes32
        ).build_transaction(
            {
                "from": self.wallet_address,
                "nonce": nonce,
                "chainId": self.web3.eth.chain_id,
                "gas": 150000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )

        # Sign transaction using private key from .env
        signed_transaction = self.web3.eth.account.sign_transaction(
            transaction,
            private_key=self.private_key,
        )

        # Send transaction
        tx_hash = self.web3.eth.send_raw_transaction(
            signed_transaction.raw_transaction
        )

        # Wait until transaction is mined
        receipt = self.web3.eth.wait_for_transaction_receipt(
            tx_hash
        )

        return {
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "gas_used": receipt.gasUsed,
            "status": receipt.status,
        }

    def verify_fingerprint(
        self,
        fingerprint_bytes32: bytes,
    ) -> Dict[str, Any]:
        """
        Verify whether a fingerprint exists on the blockchain.
        """

        if len(fingerprint_bytes32) != 32:
            raise ValueError("Fingerprint must be exactly 32 bytes")

        exists, timestamp, submitter = (
            self.contract.functions.verifyEvidence(
                fingerprint_bytes32
            ).call()
        )

        return {
            "exists": exists,
            "timestamp": timestamp,
            "submitter": submitter,
        }

    def get_network_info(self) -> Dict[str, Any]:
        """
        Return basic blockchain connection information.
        """

        return {
            "connected": self.web3.is_connected(),
            "chain_id": self.web3.eth.chain_id,
            "latest_block": self.web3.eth.block_number,
            "wallet_address": self.wallet_address,
            "contract_address": Web3.to_checksum_address(
                self.contract_address
            ),
        }