// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VeriTraceRegistry {

    struct Evidence {
        bytes32 fingerprint;
        uint256 timestamp;
        address submitter;
    }

    mapping(bytes32 => Evidence) public evidenceRecords;

    event EvidenceRegistered(
        bytes32 indexed fingerprint,
        uint256 timestamp,
        address indexed submitter
    );

    function registerEvidence(bytes32 fingerprint) external {
        require(
            evidenceRecords[fingerprint].timestamp == 0,
            "Evidence already registered"
        );

        evidenceRecords[fingerprint] = Evidence(
            fingerprint,
            block.timestamp,
            msg.sender
        );

        emit EvidenceRegistered(
            fingerprint,
            block.timestamp,
            msg.sender
        );
    }

    function verifyEvidence(bytes32 fingerprint)
        external
        view
        returns (
            bool,
            uint256,
            address
        )
    {
        Evidence memory record = evidenceRecords[fingerprint];

        bool exists = record.timestamp != 0;

        return (
            exists,
            record.timestamp,
            record.submitter
        );
    }
}