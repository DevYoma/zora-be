const { ethers } = require("ethers");
require("dotenv").config();

// Configure provider based on environment
const getProvider = () => {
  const network = process.env.ETHEREUM_NETWORK || "goerli";
  const providerUrl = process.env.PROVIDER_URL;

  if (providerUrl) {
    return new ethers.providers.JsonRpcProvider(providerUrl);
  }

  // Fallback to default provider
  return ethers.getDefaultProvider(network);
};

// Verify ticket ownership on-chain
exports.verifyTicketOwnership = async (
  collectionAddress,
  tokenId,
  claimedOwner
) => {
  try {
    const provider = getProvider();

    // ERC721 ownerOf function
    const abi = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const contract = new ethers.Contract(collectionAddress, abi, provider);

    const actualOwner = await contract.ownerOf(tokenId);

    return {
      isValid: actualOwner.toLowerCase() === claimedOwner.toLowerCase(),
      actualOwner,
    };
  } catch (error) {
    console.error("Error verifying ticket ownership:", error);
    return { isValid: false, error: error.message };
  }
};

// Get token metadata
exports.getTokenMetadata = async (collectionAddress, tokenId) => {
  try {
    const provider = getProvider();

    // ERC721 tokenURI function
    const abi = ["function tokenURI(uint256 tokenId) view returns (string)"];
    const contract = new ethers.Contract(collectionAddress, abi, provider);

    const tokenURI = await contract.tokenURI(tokenId);

    return { tokenURI };
  } catch (error) {
    console.error("Error getting token metadata:", error);
    return { error: error.message };
  }
};
