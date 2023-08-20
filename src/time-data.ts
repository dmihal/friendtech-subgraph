import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { AccountDayData, AccountHourData, ProtocolDayData, ProtocolHourData } from "../generated/schema";
import { Trade } from "../generated/FriendtechShares/FriendtechShares";
import { toETH } from "./utils";

function getPrecision(amount: BigInt, precision: u32): u32 {
  return amount.toU32() / precision * precision
}

export function updateTimeData(event: Trade, credibility: BigDecimal): void {
  if (event.params.shareAmount.toI32() == 0) {
    return
  }

  let hour = getPrecision(event.block.timestamp, 3600)
  let day = getPrecision(event.block.timestamp, 86400)

  let price = toETH(event.params.ethAmount)

  let subjectHourData = AccountHourData.load(event.params.subject.toHex() + "-" + hour.toString())
  if (subjectHourData == null) {
    subjectHourData = new AccountHourData(event.params.subject.toHex() + "-" + hour.toString())
    subjectHourData.timestamp = hour
    subjectHourData.account = event.params.subject
    subjectHourData.volume = BigInt.zero().toBigDecimal()
    subjectHourData.startPrice = price
    subjectHourData.minPrice = price
    subjectHourData.maxPrice = price
    subjectHourData.holders = 0
    subjectHourData.credibilityInflows = BigInt.zero().toBigDecimal()
    subjectHourData.credibilityOutflows = BigInt.zero().toBigDecimal()
    subjectHourData.netCredibility = BigInt.zero().toBigDecimal()
    subjectHourData.credibilityPriceRatio = BigInt.zero().toBigDecimal()
  }
  let subjectDayData = AccountDayData.load(event.params.subject.toHex() + "-" + day.toString())
  if (subjectDayData == null) {
    subjectDayData = new AccountDayData(event.params.subject.toHex() + "-" + day.toString())
    subjectDayData.timestamp = day
    subjectDayData.account = event.params.subject
    subjectDayData.volume = BigInt.zero().toBigDecimal()
    subjectDayData.startPrice = price
    subjectDayData.minPrice = price
    subjectDayData.maxPrice = price
    subjectDayData.holders = 0
    subjectDayData.credibilityInflows = BigInt.zero().toBigDecimal()
    subjectDayData.credibilityOutflows = BigInt.zero().toBigDecimal()
    subjectDayData.netCredibility = BigInt.zero().toBigDecimal()
    subjectDayData.credibilityPriceRatio = BigInt.zero().toBigDecimal()
  }

  let protocolHourData = ProtocolHourData.load(hour.toString())
  if (protocolHourData == null) {
    protocolHourData = new ProtocolHourData(hour.toString())
    protocolHourData.timestamp = hour
    protocolHourData.volume = BigInt.zero().toBigDecimal()
    protocolHourData.users = 0
    protocolHourData.shares = 0
  }
  let protocolDayData = ProtocolDayData.load(day.toString())
  if (protocolDayData == null) {
    protocolDayData = new ProtocolDayData(day.toString())
    protocolDayData.timestamp = day
    protocolDayData.volume = BigInt.zero().toBigDecimal()
    protocolDayData.users = 0
    protocolDayData.shares = 0
  }

  subjectHourData.volume += price
  subjectDayData.volume += price

  subjectDayData.endPrice = price
  subjectHourData.endPrice = price

  if (price < subjectHourData.minPrice) {
    subjectHourData.minPrice = price
  }
  if (price > subjectHourData.maxPrice) {
    subjectHourData.maxPrice = price
  }

  if (event.params.isBuy) {
    subjectHourData.credibilityInflows += credibility
    subjectDayData.credibilityInflows += credibility
  } else {
    subjectHourData.credibilityOutflows += credibility
    subjectDayData.credibilityOutflows += credibility
  }
  subjectHourData.netCredibility = subjectHourData.credibilityInflows - subjectHourData.credibilityOutflows
  subjectDayData.netCredibility = subjectDayData.credibilityInflows - subjectDayData.credibilityOutflows
  if (price.gt(BigInt.zero().toBigDecimal())) {
    subjectHourData.credibilityPriceRatio = subjectHourData.netCredibility / price
    subjectDayData.credibilityPriceRatio = subjectDayData.netCredibility / price
  }

  protocolHourData.volume += price
  protocolDayData.volume += price

  subjectHourData.save()
  subjectDayData.save()
  protocolHourData.save()
  protocolDayData.save()
}
