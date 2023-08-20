import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  Trade as TradeEvent
} from "../generated/FriendtechShares/FriendtechShares"
import { Account, Position, Protocol, Trade } from "../generated/schema"
import { toETH } from "./utils"
import { updateTimeData } from "./time-data"

function getAccount(address: Address): Account {
  let account = Account.load(address)
  if (account == null) {
    account = new Account(address)
    account.shareSupply = 0
    account.joined = 0
    account.credibility = BigInt.zero().toBigDecimal()
    account.credibilityPriceRatio = BigInt.zero().toBigDecimal()
    account.tradingFees = BigInt.zero().toBigDecimal()
    account.lastTradePrice = BigInt.zero().toBigDecimal()
  }
  return account as Account
}

function getPosition(owner: Address, subject: Address): Position {
  let id = owner.concat(subject)
  let position = Position.load(id)
  if (position == null) {
    position = new Position(id)
    position.owner = owner
    position.subject = subject
    position.shares = 0
    position.credibility = BigInt.zero().toBigDecimal()
    position.save()
  }
  return position as Position
}

function getProtocol(): Protocol {
  let id = "protocol"
  let protocol = Protocol.load(id)
  if (protocol == null) {
    protocol = new Protocol(id)
    protocol.accounts = 0
    protocol.tradingFees = BigInt.zero().toBigDecimal()
  }
  return protocol as Protocol
}

export function handleTrade(event: TradeEvent): void {
  let entity = new Trade(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  let trader = getAccount(event.params.trader)
  let subject = getAccount(event.params.subject)
  let protocol = getProtocol()

  let position = getPosition(event.params.trader, event.params.subject)
  if (event.params.isBuy) {
    position.shares += event.params.shareAmount.toI32()
  } else {
    position.shares -= event.params.shareAmount.toI32()
  }

  subject.lastTradePrice = toETH(event.params.ethAmount)
  subject.shareSupply = event.params.supply.toI32()
  subject.tradingFees += toETH(event.params.subjectEthAmount)
  if (subject.joined == 0) {
    subject.joined = event.block.timestamp.toI32()
    protocol.accounts += 1
  }

  let currentCredibility = trader.lastTradePrice * BigInt.fromI32(position.shares).toBigDecimal()
  subject.credibility = subject.credibility - position.credibility + currentCredibility
  if (subject.lastTradePrice.gt(BigInt.zero().toBigDecimal())) {
    subject.credibilityPriceRatio = subject.credibility / subject.lastTradePrice
  }
  position.credibility = currentCredibility

  protocol.tradingFees += toETH(event.params.protocolEthAmount)

  entity.trader = event.params.trader
  entity.subject = event.params.subject
  entity.isBuy = event.params.isBuy
  entity.shareAmount = event.params.shareAmount.toI32()
  entity.ethAmount = toETH(event.params.ethAmount)
  entity.protocolEthAmount = toETH(event.params.protocolEthAmount)
  entity.subjectEthAmount = toETH(event.params.subjectEthAmount)
  entity.supply = event.params.supply.toI32()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  updateTimeData(event, currentCredibility)

  if (position.shares == 0) {
    store.remove("Position", position.id.toHexString())
  } else {
    position.save()
  }
  entity.save()
  trader.save()
  subject.save()
  protocol.save()
}
