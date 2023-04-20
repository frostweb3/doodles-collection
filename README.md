# Intent of the project
This is a learning project, intended to expose devs to how to create a basic subgraph.

Read more about [The Graph protocol](https://thegraph.com/en/)

# Steps to create a subgraph

## Install graph CLI

In order to work with the graph command line interface, install the package

```
npm install -g @graphprotocol/graph-cli
```

Check if it is installed with 
```
graph --version
```

## Initialize the subgraph project
Run the 

```
graph init --product hosted-service <your-username>/doodles-collection
```

command to create a new subgraph.

To create a subgraph for ERC721 collection on Ethereum mainnet choose the follwoing options:

```
✔ Protocol · ethereum

✔ Subgraph name · <your-username>/doodles-collection

✔ Directory to create the subgraph in · doodles-collection

✔ Ethereum network · mainnet

✔ Contract address · 0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e

✔ Fetching ABI from Etherscan

✔ Fetching Start Block

✔ Start Block · 13430097

✔ Contract Name · Token

✔ Index contract events as entities (Y/n) · false

  Generate subgraph

  Write subgraph to directory

✔ Create subgraph scaffold

✔ Initialize networks config

✔ Initialize subgraph repository

✔ Install dependencies with yarn

✔ Generate ABI and schema types with yarn codegen

Add another contract? (y/n): n
```

## Define the schema entities
Open the `schema.graphql` file and define `Token` and `User` (represents the token receiver) entities


```
type Token @entity {
  id: ID!
  name: String!
  tokenID: BigInt!
  tokenURI: String!
  updatedAtTimestamp: BigInt!
  owner: User!
}

type User @entity {
 id: ID!
 tokens: [Token!]! @derivedFrom(field: "owner")
}
```

Read more about [defining entities](https://thegraph.com/docs/en/developing/creating-a-subgraph/#defining-entities)

## Define the used entities in the subgraph.yaml file

In the `subgraph.yaml` file, specify the used entities
```
dataSources:
    ...
    mapping:
      ...
      entities:
        - Token
        - User
```

## Add a full text search
In the `schema.graphql` file, add the following

```
type _Schema_
  @fulltext(
    name: "attributeSearch"
    language: en
    algorithm: rank
    include: [{entity: "Token", fields:
      [{ name: "name" }]
    }]
  )
```

This will allow us to do a full text search on the token names.

## Enable the full text search feature

In the `subgraph.yaml` file, enable the `fullTextSearch` and `ipfsOnEthereumContracts` features

```
features:
  - fullTextSearch
  - ipfsOnEthereumContracts
```

We will need the IPFS feature in next steps.

## Generate AssemblyScript types for a subgraph

In order to run the AssemblyScript generation, execute the command

```
graph codegen
```

This will create or update files under `generated/` directory.

## Define the transfer event handler function

Use this code inside of the 'src/token.ts` file

```
import { ipfs, json, log } from '@graphprotocol/graph-ts'
import {
  Transfer as TransferEvent
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
    
    if (metadata) {
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
```

This function will be called any time that a `Transfer` event gets indexed.

## Register the transfer event handler function

In the `subgraph.yaml` file, add these lines (`dataSources.mapping.eventHandlers` section)

```
dataSources:
  ...
    source: ...
    mapping:
      ...
      entities: ...
      abis: ...
      eventHandlers:
        - event: Transfer(indexed address,indexed address,indexed uint256)
          handler: handleTransfer
```

Now any time a transfer event is being indexed `handleTransfer` function will get called.

## Authenticate with your deploy key
Run this command to auth

```
graph auth --product hosted-service <your-username>/doodles-collection
```

## Compile and deploy your subgraph

To deploy your subgraph, run the following command

```
graph deploy --product hosted-service <your-username>/doodles-collection
```

After this completes successfully, you should see an URL like this

```
Deployed to https://thegraph.com/explorer/subgraph/<your-username>/doodles-collection
```

# Play around with your subgraph data

Visit the link above to open the playground.
Paste in this query to fetch first 3 tokens from the collection

```
{
  tokens(first: 3) {
    id
    name
    tokenID
    tokenURI
  }
}
```

You should see something like this 

```
{
  "data": {
    "tokens": [
      {
        "id": "0",
        "name": "Doodle #0",
        "tokenID": "0",
        "tokenURI": "/0"
      },
      {
        "id": "1",
        "name": "Doodle #1",
        "tokenID": "1",
        "tokenURI": "/1"
      },
      {
        "id": "10",
        "name": "Doodle #10",
        "tokenID": "10",
        "tokenURI": "/10"
      }
    ]
  }
}
```

To do a full text search for a token name use this query

```
{
  attributeSearch(
    text: "12"
  ) {
    id
    name
  }
}
```

The response should be something like this 

```
{
  "data": {
    "attributeSearch": [
      {
        "id": "12",
        "name": "Doodle #12"
      }
    ]
  }
}
```


## Read more
Make sure to visit the documentation on https://thegraph.com/docs/ for further information.


