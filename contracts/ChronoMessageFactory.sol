// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ChronoMessage.sol";

/**
 * @title ChronoMessageFactory
 * @notice Factory contract that allows users to deploy their own ChronoMessage instances
 * @dev Users can deploy on any EVM chain and own their contract
 */
contract ChronoMessageFactory {
    // Events
    event ChronoMessageDeployed(
        address indexed deployer,
        address indexed contractAddress,
        uint256 timestamp,
        uint256 chainId
    );

    // Mapping to track all deployments
    mapping(address => address[]) public userDeployments;
    address[] public allDeployments;

    // Contract metadata
    struct DeploymentInfo {
        address owner;
        address contractAddress;
        uint256 deployedAt;
        uint256 chainId;
        string networkName;
    }

    mapping(address => DeploymentInfo) public deploymentInfo;

    /**
     * @notice Deploy a new ChronoMessage contract
     * @param networkName Optional network name for identification
     * @return contractAddress The address of the newly deployed contract
     */
    function deployChronoMessage(string memory networkName) 
        external 
        returns (address contractAddress) 
    {
        // Deploy new ChronoMessage contract
        ChronoMessage newContract = new ChronoMessage();
        contractAddress = address(newContract);

        // Store deployment info
        deploymentInfo[contractAddress] = DeploymentInfo({
            owner: msg.sender,
            contractAddress: contractAddress,
            deployedAt: block.timestamp,
            chainId: block.chainid,
            networkName: networkName
        });

        // Track deployments
        userDeployments[msg.sender].push(contractAddress);
        allDeployments.push(contractAddress);

        // Emit event
        emit ChronoMessageDeployed(
            msg.sender,
            contractAddress,
            block.timestamp,
            block.chainid
        );

        return contractAddress;
    }

    /**
     * @notice Get all contracts deployed by a specific user
     * @param user The address of the user
     * @return Array of contract addresses
     */
    function getUserDeployments(address user) 
        external 
        view 
        returns (address[] memory) 
    {
        return userDeployments[user];
    }

    /**
     * @notice Get total number of deployments
     * @return Total count of deployed contracts
     */
    function getTotalDeployments() external view returns (uint256) {
        return allDeployments.length;
    }

    /**
     * @notice Get all deployed contracts (paginated)
     * @param offset Starting index
     * @param limit Number of results
     * @return Array of contract addresses
     */
    function getAllDeployments(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory) 
    {
        require(offset < allDeployments.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > allDeployments.length) {
            end = allDeployments.length;
        }
        
        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allDeployments[offset + i];
        }
        
        return result;
    }

    /**
     * @notice Get deployment information
     * @param contractAddress The contract address to query
     * @return info The deployment information
     */
    function getDeploymentInfo(address contractAddress) 
        external 
        view 
        returns (DeploymentInfo memory) 
    {
        return deploymentInfo[contractAddress];
    }

    /**
     * @notice Check if an address is a valid ChronoMessage deployed by this factory
     * @param contractAddress The address to check
     * @return True if valid, false otherwise
     */
    function isValidDeployment(address contractAddress) 
        external 
        view 
        returns (bool) 
    {
        return deploymentInfo[contractAddress].contractAddress != address(0);
    }
}
