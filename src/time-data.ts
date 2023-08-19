import { BigInt } from "@graphprotocol/graph-ts";
import { AccountDayData, AccountHourData, ProtocolDayData, ProtocolHourData } from "../generated/schema";
import { Trade } from "../generated/FriendtechShares/FriendtechShares";
import { toETH } from "./utils";

function getPrecision(amount: BigInt, precision: u32): u32 {
  return amount.toU32() / precision * precision
}

export function updateTimeData(event: Trade): void {
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

  protocolHourData.volume += price
  protocolDayData.volume += price

  subjectHourData.save()
  subjectDayData.save()
  protocolHourData.save()
  protocolDayData.save()
}
