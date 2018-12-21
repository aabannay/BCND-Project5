pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        string starStory;
        string ra;
        string dec;
        string mag;
    }

    mapping(uint256 => Star) public tokenIdToStarInfo; 
    mapping(uint256 => uint256) public starsForSale;


    //new mapping for the coordinates
    //the keccak256 of the 3 cooridnates to the token ID 
    mapping(bytes32 => bool) public coordinatesRecorded;


    function createStar(string _name, string _starStory, string _ra, string _dec, string _mag, uint256 _tokenId) public { 
        //check if the star is unique
        //this is done by checking the uniqueness of the star's coordinates
        require(!coordinatesRecorded[keccak256(_ra, _dec, _mag)]); //star was not recorded

        Star memory newStar = Star({name: _name, starStory: _starStory, ra: _ra, dec: _dec, mag: _mag});
        
        //add the star coordinates hash to the cooridnates recorded
        coordinatesRecorded[keccak256(_ra, _dec, _mag)] = true; 

        tokenIdToStarInfo[_tokenId] = newStar;

        mint(msg.sender, _tokenId);
    }

    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        require(this.ownerOf(_tokenId) == msg.sender);

        starsForSale[_tokenId] = _price;
    }

    function buyStar(uint256 _tokenId) public payable { 
        require(starsForSale[_tokenId] > 0);
        
        uint256 starCost = starsForSale[_tokenId];
        address starOwner = this.ownerOf(_tokenId);
        require(msg.value >= starCost);

        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);
        
        starOwner.transfer(starCost);

        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function checkIfStarExist(string _ra, string _dec, string _mag) public view returns (bool) {
        return coordinatesRecorded[keccak256(_ra, _dec, _mag)];
    }

    /* function starsForSale(uint256 tokenId) public view returns (uint256){
        return starsForSale(tokenId);
    } */

    function tokenIdToStarInfo(uint256 tokenId) public view returns (string, string, string, string, string){
        Star star = tokenIdToStarInfo[tokenId];
        string memory raString = strConcat("ra_", star.ra);
        string memory decString = strConcat("dec_", star.dec);
        string memory magString = strConcat("mag_", star.mag);
        return (star.name, star.starStory, raString, decString, magString);
    }

    //methods that are implemented by openzeppelin 
    function mint(address to, uint256 tokenId) public {
        super._mint(to, tokenId);
    }

    function approve(address to, uint256 tokenId) public {
        super.approve(to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data) public {
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    function setApprovalForAll(address to, bool approved) public {
        super.setApprovalForAll(to, approved);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        return super.getApproved(tokenId);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return super.isApprovedForAll(owner, operator);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        return super.ownerOf(tokenId);
    }


    //string concatenating functions 
    //resorce: https://ethereum.stackexchange.com/questions/729/how-to-concatenate-strings-in-solidity
    //MODIFIED to cover 2 string cases, the original function from resource can concatenate upto 5 strings.
    function strConcat(string _a, string _b) internal returns (string){
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);

        string memory ab = new string(_ba.length + _bb.length);
        bytes memory bab = bytes(ab);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) bab[k++] = _ba[i];
        for (i = 0; i < _bb.length; i++) bab[k++] = _bb[i];
        return string(bab);
    }
}