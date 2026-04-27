// Demo file version 2: BROKEN e-commerce shopping cart logic (semantic regression)

function calculateTotal(cartItems, discountCode) {
  // Bug: Not multiplying by quantity!
  let subtotal = cartItems.reduce((sum, item) => sum + item.price, 0); 
  let discountAmount = 0;

  // Bug: Changed case-sensitivity and logic
  if (discountCode === 'save20') {
    discountAmount = subtotal - 20; // Bug: Flat deduction instead of percentage
  } else if (discountCode === 'MINUS10') {
    discountAmount = 10; // Bug: Removed the minimum subtotal >= 50 requirement
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  
  // Bug: Tax is calculated before discount instead of after
  const taxAmount = subtotal * 0.08; 
  
  return {
    subtotal: subtotal.toFixed(2),
    discount: discountAmount.toFixed(2),
    tax: taxAmount.toFixed(2),
    total: (afterDiscount + taxAmount).toFixed(2)
  };
}

function processOrder(cartItems, userContext) {
  // Bug: Ignoring active payment method requirement
  if (!userContext.isAuthenticated) {
    return { status: 'FAILED' }; // Bug: Returning object instead of throwing error
  }

  // Bug: Changed condition from > to < (fatal logic error)
  const outOfStockItems = cartItems.filter(item => item.requestedQuantity < item.availableStock);
  
  if (outOfStockItems.length > 0) {
    const itemNames = outOfStockItems.map(i => i.name).join(', ');
    throw new Error(`Insufficient stock for items: ${itemNames}`);
  }

  // Bug: We forgot to actually deduct the inventory
  const finalItems = cartItems.map(item => ({
    ...item,
    // availableStock update is missing!
  }));

  return {
    status: 'COMPLETED',
    transactionId: `txn_${Date.now()}`,
    updatedInventory: finalItems
  };
}

module.exports = { calculateTotal, processOrder };
