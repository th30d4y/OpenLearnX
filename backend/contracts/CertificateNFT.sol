// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    struct Certificate {
        string subject;
        string studentName;
        uint256 score;
        uint256 timestamp;
        bool verified;
    }
    
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public userCertificates;
    
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed student,
        string subject,
        uint256 score,
        string tokenURI
    );
    
    constructor() ERC721("OpenLearnX Certificate", "OLXC") {}
    
    function mintCertificate(
        address to,
        string memory _tokenURI
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        certificates[newTokenId] = Certificate({
            subject: "General",
            studentName: "",
            score: 100,
            timestamp: block.timestamp,
            verified: true
        });
        
        userCertificates[to].push(newTokenId);
        
        emit CertificateMinted(newTokenId, to, "General", 100, _tokenURI);
        
        return newTokenId;
    }
    
    function mintCertificateWithDetails(
        address to,
        string memory _tokenURI,
        string memory subject,
        string memory studentName,
        uint256 score
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        certificates[newTokenId] = Certificate({
            subject: subject,
            studentName: studentName,
            score: score,
            timestamp: block.timestamp,
            verified: true
        });
        
        userCertificates[to].push(newTokenId);
        
        emit CertificateMinted(newTokenId, to, subject, score, _tokenURI);
        
        return newTokenId;
    }
    
    function getCertificate(uint256 tokenId) 
        public 
        view 
        returns (Certificate memory) 
    {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId];
    }
    
    function getUserCertificates(address user) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return userCertificates[user];
    }
    
    function verifyCertificate(uint256 tokenId) 
        public 
        view 
        returns (bool) 
    {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId].verified;
    }
    
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }
    
    // Override required functions
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}