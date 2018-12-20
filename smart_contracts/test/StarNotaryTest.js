const StarNotary = artifacts.require('StarNotary')

//to test the revert error 
function errorIsRevert(error) {
    return error.message.startsWith("VM Exception while processing transaction: revert")
}

contract('StarNotary', accounts => { 

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: accounts[0]})
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

                await this.contract.createStar(name, starStory, newRa, newDec, newMag, id, {from: user1})

                let starInfo = await this.contract.tokenIdToStarInfo(id)
                assert.equal(starInfo[0], name)
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
})