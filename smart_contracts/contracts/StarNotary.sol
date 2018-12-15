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

        _mint(msg.sender, _tokenId);
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
}