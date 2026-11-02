// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.23;

/// @notice ERC-5564 reference announcer. This contract emits announcements only;
/// it does not transfer tokens or attest to settlement.
contract ERC5564Announcer {
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external {
        emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }
}
