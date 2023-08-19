import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"

let EIGHTEEN_DECIMALS = BigInt.fromI32(10).pow(18).toBigDecimal()

export function toETH(amount: BigInt): BigDecimal {
  if (amount == BigInt.zero()) {
    return BigDecimal.zero()
  }
  return amount.divDecimal(EIGHTEEN_DECIMALS)
}
