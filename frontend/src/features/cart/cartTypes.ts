export type CartLine = {
  productId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
}

export type CartState = {
  items: CartLine[]
}
