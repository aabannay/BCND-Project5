const StarNotary = artifacts.require('StarNotary')

//to test the revert error 
function errorIsRevert(error) {
    return error.message.startsWith("VM Exception while processing transaction: revert")
}

contract('StarNotary', accounts => { 

    //accounts to be used during test 
    var defaultAccount = accounts[0]
    var user1 = accounts[1]
    var user2 = accounts[2]
    var operator = accounts[3]

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: defaultAccount})
    })
    
    describe('can create a star', () => { 
        it('can create a star and get its name', async function () { 
            
            await this.contract.createStar('awesome star!','the story is not boring','1','1','1', 1, {from: accounts[0]})

            //use deepEqual here to compare arrays because equal compares objects rather than their data
            assert.deepEqual(await this.contract.tokenIdToStarInfo(1), ['awesome star!','the story is not boring','ra_1','dec_1','mag_1'])
        })
    })

    //this will test if the star uniqueness logic is correct
    describe('star uniqueness', () => {
        let user1 = accounts[1]
        it('only stars unique stars can be minted', async function() { 
            // first we mint our first star
            await this.contract.createStar('awesome star!','the story is not boring','1','1','1', 1, {from: accounts[0]})
            
            //check if the star really exist 
            assert(await this.contract.checkIfStarExist('1','1','1'))

            // then we try to mint the same star, and we expect an error
            try {
                await this.contract.createStar('awesome star!','the story is not boring','1','1','1', 1, {from: accounts[0]})
            } catch(error) {
                assert(errorIsRevert(error))
            }
        })

        it('only stars unique stars can be minted even if their ID is different', async function() { 
            // first we mint our first star
            await this.contract.createStar('awesome star!','the story is not boring','1','1','1', 1, {from: accounts[0]})
            // then we try to mint the same star, and we expect an error
            
            //check if the star really exist 
            assert(await this.contract.checkIfStarExist('1','1','1'))

            try {
                await this.contract.createStar('awesome star!','the story is not boring','1','1','1', 2, {from: accounts[0]})
            } catch(error) {
                assert(errorIsRevert(error))
            }
        })

        it('minting unique stars does not fail', async function() { 
            for(let i = 0; i < 10; i ++) { 
                let id = i
                let name = "The Name: " + i; 
                let starStory = "The Story: " + i; 
                let newRa = i.toString()
                let newDec = i.toString()
                let newMag = i.toString()

                //check if the star does not. exist before creating it
                assert.isFalse(await this.contract.checkIfStarExist(newRa, newDec, newMag))

                await this.contract.createStar(name, starStory, newRa, newDec, newMag, id, {from: user1})

                //check the info of the star as provided and expected
                let starInfo = await this.contract.tokenIdToStarInfo(id)
                assert.equal(starInfo[0], name)
                assert.equal(starInfo[1], starStory)
                assert.equal(starInfo[2], 'ra_' + newRa)
                assert.equal(starInfo[3], 'dec_' + newDec)
                assert.equal(starInfo[4], 'mag_' + newMag)
            }
        })
    })

    describe('buying and selling stars', () => { 
        let user1 = accounts[1]
        let user2 = accounts[2]
        let randomMaliciousUser = accounts[3]
        
        let starId = 1
        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () { 
            await this.contract.createStar('awesome star!','the story is not boring','1','1','1', starId, {from: user1})    
        })

        it('user1 can put up their star for sale', async function () { 
            assert.equal(await this.contract.ownerOf(starId), user1)
            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            
            assert.equal(await this.contract.starsForSale(starId), starPrice)
        })

        describe('user2 can buy a star that was put up for sale', () => { 
            beforeEach(async function () { 
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })

            it('user2 is the owner of the star after they buy it', async function() { 
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
                assert.equal(await this.contract.ownerOf(starId), user2)
            })

            it('user2 ether balance changed correctly', async function () { 
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })


    //this is for testing the token functionality i.e. ERC721   
    describe('can create a token', () => { 
        let tokenId = 1
        let tx

        beforeEach(async function () { 
            tx = await this.contract._mint(user1, tokenId, {from: user1})
        })

        it('ownerOf tokenId is user1', async function () { 
            assert.equal(await this.contract.ownerOf(tokenId), user1)
        })

        it('balanceOf user1 is incremented by 1', async function () { 
            assert.equal(await this.contract.balanceOf(user1), 1)
        })

        it('emits the correct event during creation of a new token', async function () { 
            assert.equal(tx.logs[0].event, 'Transfer')
        })
    })

    describe('can transfer token', () => { 
        let tokenId = 1
        let tx 
        let user3 = accounts[4]

        beforeEach(async function () { 
            await this.contract._mint(user1, tokenId, {from: user1})

            tx = await this.contract.transferFrom(user1, user2, tokenId, {from: user1})
        })

        it('token has new owner', async function () { 
            assert.equal(await this.contract.ownerOf(tokenId), user2)
        })

        it('emits the correct event', async function () { 
            assert.equal(tx.logs[0].event, 'Transfer')
        })

        it('only permissioned users can transfer tokens', async function() { 
            it('revert if user1 tries to transfer same token that he already transffered', async () => {
                try {
                    await this.contract.transferFrom(user1, user2, tokenId, {from: user1})
                } catch (error) {
                    assert(errorIsRevert(error))
                }
            })
            
            it('user2 now can transfer the token to another user: user3', async () => {
                let tx2
                tx2 = await this.contract.transferFrom(user2, user3, tokenId, {from: user2})
                assert.equal(await this.contract.ownerOf(tokenId), user3)
            })
        })

    })

     describe('can grant approval to transfer', () => { 
        let tokenId = 1
        let tx 
        user3 = accounts[4]

        beforeEach(async function () { 
            await this.contract._mint(user1, tokenId, {from: user1})
            tx = await this.contract.approve(user2, tokenId, {from: user1})
        })

        it('set user2 as an approved address', async function () { 
            assert.equal(await this.contract.getApproved(tokenId), user2)
        })

        //user2 will transfer from user1 to user3 because user2 is approved
        it('user2 can now transfer', async function () { 
            let tx2 = await this.contract.transferFrom(user1, user3, tokenId, {from: user2})
            assert.equal(await this.contract.ownerOf(tokenId), user3)
        })

        it('emits the correct event', async function () { 
            assert.equal(tx.logs[0].event, 'Approval')
        })
    })

    describe('can set an operator', () => { 
        let tokenId = 1
        let tx 

        beforeEach(async function () { 
            await this.contract._mint(user1, tokenId, {from: user1})

            tx = await this.contract.setApprovalForAll(operator, true, {from: user1})
        })

        it('can set an operator', async function () { 
           //check if the operator is approved to transfer all what user1 has
           assert.isTrue(await this.contract.isApprovedForAll(user1, operator))
        })
    })
 
})