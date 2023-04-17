import { ipfs, json, log } from '@graphprotocol/graph-ts'
import {
  Transfer as TransferEvent,
  Token as TokenContract
} from '../generated/Token/Token'
import {
Token, User
} from '../generated/schema'

const ipfshash = "QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS"

export function handleTransfer(event: TransferEvent): void {
  /* load the token from the existing Graph Node */
  let token = Token.load(event.params.tokenId.toString())
  if (!token) {
    /* if the token does not yet exist, create it */
    token = new Token(event.params.tokenId.toString())
    token.tokenID = event.params.tokenId
 
    token.tokenURI = "/" + event.params.tokenId.toString()

    /* combine the ipfs hash and the token ID to fetch the token metadata from IPFS */
    let metadata = ipfs.cat(ipfshash + token.tokenURI)
    // log.info('Will there be metadata? {}', [""])
    if (metadata) {
      // log.info('Metadata: {}', [metadata.toString()])
      const jsonMetadata = json.fromBytes(metadata).toObject()
      if (jsonMetadata) {
        /* using the metatadata from IPFS, update the token object with the values  */
        const name = jsonMetadata.get('name')

        if (name) {
          token.name = name.toString()
        }

      }
    }
  }
  token.updatedAtTimestamp = event.block.timestamp

  /* set or update the owner field and save the token to the Graph Node */
  token.owner = event.params.to.toHexString()
  token.save()
  
  /* if the user does not yet exist, create them */
  let user = User.load(event.params.to.toHexString())
  if (!user) {
    user = new User(event.params.to.toHexString())
    user.save()
  }
}