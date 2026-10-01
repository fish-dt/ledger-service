package com.portfolio.ledger.exception;

public class UnbalancedTransactionException extends RuntimeException {
    public UnbalancedTransactionException(long sumCents) {
        super("Transaction entries sum to " + sumCents + " cents; must sum to 0");
    }
}
