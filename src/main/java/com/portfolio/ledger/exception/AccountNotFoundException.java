package com.portfolio.ledger.exception;

public class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException(Long accountId) {
        super("Account " + accountId + " not found");
    }
}
