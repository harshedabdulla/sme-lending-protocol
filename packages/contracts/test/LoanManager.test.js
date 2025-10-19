const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LoanManager", function () {
    let usdt, pool, creditScore, loanManager;
    let owner, oracle, lender, borrower1, borrower2;

    // Test constants
    const MIN_CREDIT_SCORE = 600;
    const MAX_LOAN_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 USDT (6 decimals)
    const LOAN_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
    const BASE_INTEREST_RATE = 500; // 5% in basis points

    beforeEach(async () => {
        [owner, oracle, lender, borrower1, borrower2] = await ethers.getSigners();

        // Deploy MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy();
        await usdt.waitForDeployment();

        // Deploy CreditScore
        const CreditScore = await ethers.getContractFactory("CreditScore");
        creditScore = await CreditScore.deploy(oracle.address);
        await creditScore.waitForDeployment();

        // Deploy LendingPool
        const LendingPool = await ethers.getContractFactory("LendingPool");
        pool = await LendingPool.deploy(await usdt.getAddress());
        await pool.waitForDeployment();

        // Deploy LoanManager
        const LoanManager = await ethers.getContractFactory("LoanManager");
        loanManager = await LoanManager.deploy(
            await pool.getAddress(),
            await creditScore.getAddress(),
            MIN_CREDIT_SCORE,
            MAX_LOAN_AMOUNT,
            LOAN_DURATION,
            BASE_INTEREST_RATE
        );
        await loanManager.waitForDeployment();

        // Set LoanManager as the loan manager in LendingPool
        await pool.connect(owner).setLoanManager(await loanManager.getAddress());

        // Setup: Mint USDT to lender and add liquidity to pool
        await usdt.mint(lender.address, ethers.parseUnits("100000", 6));
        await usdt.connect(lender).approve(await pool.getAddress(), ethers.parseUnits("100000", 6));
        await pool.connect(lender).deposit(ethers.parseUnits("50000", 6));

        // Mint USDT to borrowers for repayment
        await usdt.mint(borrower1.address, ethers.parseUnits("10000", 6));
        await usdt.mint(borrower2.address, ethers.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
        it("Should set correct initial parameters", async () => {
            expect(await loanManager.minCreditScore()).to.equal(MIN_CREDIT_SCORE);
            expect(await loanManager.maxLoanAmount()).to.equal(MAX_LOAN_AMOUNT);
            expect(await loanManager.defaultLoanDuration()).to.equal(LOAN_DURATION);
            expect(await loanManager.baseInterestRate()).to.equal(BASE_INTEREST_RATE);
        });

        it("Should reference correct contracts", async () => {
            expect(await loanManager.lendingPool()).to.equal(await pool.getAddress());
            expect(await loanManager.creditScore()).to.equal(await creditScore.getAddress());
        });

        it("Should revert with invalid constructor parameters", async () => {
            const LoanManager = await ethers.getContractFactory("LoanManager");

            await expect(
                LoanManager.deploy(
                    ethers.ZeroAddress,
                    await creditScore.getAddress(),
                    MIN_CREDIT_SCORE,
                    MAX_LOAN_AMOUNT,
                    LOAN_DURATION,
                    BASE_INTEREST_RATE
                )
            ).to.be.revertedWith("Invalid lending pool address");
        });
    });

    describe("Interest Rate Calculation", function () {
        it("Should calculate lowest rate for score 900-1000", async () => {
            expect(await loanManager.calculateInterestRate(950)).to.equal(BASE_INTEREST_RATE);
            expect(await loanManager.calculateInterestRate(1000)).to.equal(BASE_INTEREST_RATE);
        });

        it("Should calculate rate tiers correctly", async () => {
            expect(await loanManager.calculateInterestRate(850)).to.equal(BASE_INTEREST_RATE + 200);
            expect(await loanManager.calculateInterestRate(750)).to.equal(BASE_INTEREST_RATE + 400);
            expect(await loanManager.calculateInterestRate(650)).to.equal(BASE_INTEREST_RATE + 600);
            expect(await loanManager.calculateInterestRate(500)).to.equal(BASE_INTEREST_RATE + 800);
        });
    });

    describe("Loan Request", function () {
        it("Should allow eligible borrower to request loan", async () => {
            // Set credit score for borrower
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);

            const loanAmount = ethers.parseUnits("1000", 6);

            await expect(loanManager.connect(borrower1).requestLoan(loanAmount))
                .to.emit(loanManager, "LoanRequested")
                .to.emit(loanManager, "LoanDisbursed");

            const loan = await loanManager.getLoanDetails(borrower1.address);
            expect(loan.principal).to.equal(loanAmount);
            expect(loan.status).to.equal(1); // Active
        });

        it("Should reject borrower with low credit score", async () => {
            // Set credit score below minimum
            await creditScore.connect(oracle).updateScore(borrower1.address, 500);

            const loanAmount = ethers.parseUnits("1000", 6);

            await expect(
                loanManager.connect(borrower1).requestLoan(loanAmount)
            ).to.be.revertedWith("Credit score too low");
        });

        it("Should reject loan amount exceeding maximum", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 800);

            const excessiveAmount = MAX_LOAN_AMOUNT + ethers.parseUnits("1", 6);

            await expect(
                loanManager.connect(borrower1).requestLoan(excessiveAmount)
            ).to.be.revertedWith("Amount exceeds maximum loan");
        });

        it("Should reject borrower with active loan", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);

            const loanAmount = ethers.parseUnits("1000", 6);
            await loanManager.connect(borrower1).requestLoan(loanAmount);

            // Try to request another loan
            await expect(
                loanManager.connect(borrower1).requestLoan(loanAmount)
            ).to.be.revertedWith("Active loan already exists");
        });

        it("Should calculate interest correctly based on credit score", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 850);

            const loanAmount = ethers.parseUnits("1000", 6);
            await loanManager.connect(borrower1).requestLoan(loanAmount);

            const loan = await loanManager.getLoanDetails(borrower1.address);
            const expectedRate = BASE_INTEREST_RATE + 200; // 700 bps = 7%
            const expectedInterest = (loanAmount * BigInt(expectedRate)) / 10000n;
            const expectedTotal = loanAmount + expectedInterest;

            expect(loan.interestRate).to.equal(expectedRate);
            expect(loan.totalOwed).to.equal(expectedTotal);
        });

        it("Should set correct loan deadline", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);

            const loanAmount = ethers.parseUnits("1000", 6);
            const tx = await loanManager.connect(borrower1).requestLoan(loanAmount);
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

            const loan = await loanManager.getLoanDetails(borrower1.address);
            expect(loan.deadline).to.equal(blockTimestamp + LOAN_DURATION);
        });

        it("Should increment total active loans counter", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await creditScore.connect(oracle).updateScore(borrower2.address, 800);

            expect(await loanManager.totalActiveLoans()).to.equal(0);

            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));
            expect(await loanManager.totalActiveLoans()).to.equal(1);

            await loanManager.connect(borrower2).requestLoan(ethers.parseUnits("2000", 6));
            expect(await loanManager.totalActiveLoans()).to.equal(2);
        });
    });

    describe("Loan Repayment", function () {
        beforeEach(async () => {
            // Setup borrower with active loan
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));

            // Approve LoanManager to spend principal amount for repayments
            const loan = await loanManager.getLoanDetails(borrower1.address);
            await usdt.connect(borrower1).approve(await loanManager.getAddress(), loan.principal);
        });

        it("Should allow partial repayment", async () => {
            const loan = await loanManager.getLoanDetails(borrower1.address);
            const repayAmount = ethers.parseUnits("500", 6);

            await expect(loanManager.connect(borrower1).repayLoan(repayAmount))
                .to.emit(loanManager, "LoanRepayment");

            const updatedLoan = await loanManager.getLoanDetails(borrower1.address);
            expect(updatedLoan.amountRepaid).to.equal(repayAmount);
            expect(updatedLoan.status).to.equal(1); // Still Active
        });

        it("Should allow full repayment and mark loan as repaid", async () => {
            const loan = await loanManager.getLoanDetails(borrower1.address);
            const totalOwed = loan.totalOwed;

            await expect(loanManager.connect(borrower1).repayLoan(totalOwed))
                .to.emit(loanManager, "LoanFullyRepaid");

            const updatedLoan = await loanManager.getLoanDetails(borrower1.address);
            expect(updatedLoan.status).to.equal(2); // Repaid
            expect(await loanManager.totalActiveLoans()).to.equal(0);
        });

        it("Should reject repayment exceeding remaining debt", async () => {
            const loan = await loanManager.getLoanDetails(borrower1.address);
            const excessAmount = loan.totalOwed + ethers.parseUnits("1", 6);

            await usdt.connect(borrower1).approve(await pool.getAddress(), excessAmount);

            await expect(
                loanManager.connect(borrower1).repayLoan(excessAmount)
            ).to.be.revertedWith("Amount exceeds remaining debt");
        });

        it("Should reject repayment without active loan", async () => {
            const repayAmount = ethers.parseUnits("100", 6);
            await usdt.connect(borrower2).approve(await pool.getAddress(), repayAmount);

            await expect(
                loanManager.connect(borrower2).repayLoan(repayAmount)
            ).to.be.revertedWith("No active loan");
        });

        it("Should update remaining debt correctly after multiple repayments", async () => {
            const loan = await loanManager.getLoanDetails(borrower1.address);
            const payment1 = ethers.parseUnits("300", 6);
            const payment2 = ethers.parseUnits("400", 6);

            await loanManager.connect(borrower1).repayLoan(payment1);
            let remaining = await loanManager.getRemainingDebt(borrower1.address);
            expect(remaining).to.equal(loan.totalOwed - payment1);

            await loanManager.connect(borrower1).repayLoan(payment2);
            remaining = await loanManager.getRemainingDebt(borrower1.address);
            expect(remaining).to.equal(loan.totalOwed - payment1 - payment2);
        });
    });

    describe("Loan Default", function () {
        beforeEach(async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));

            // Approve for potential repayments
            const loan = await loanManager.getLoanDetails(borrower1.address);
            await usdt.connect(borrower1).approve(await loanManager.getAddress(), loan.principal);
        });

        it("Should mark overdue loan as defaulted", async () => {
            // Fast forward time past deadline
            await time.increase(LOAN_DURATION + 1);

            await expect(loanManager.markAsDefault(borrower1.address))
                .to.emit(loanManager, "LoanDefaulted");

            const loan = await loanManager.getLoanDetails(borrower1.address);
            expect(loan.status).to.equal(3); // Defaulted
            expect(await loanManager.totalActiveLoans()).to.equal(0);
        });

        it("Should not mark loan as default before deadline", async () => {
            await expect(
                loanManager.markAsDefault(borrower1.address)
            ).to.be.revertedWith("Loan deadline not passed");
        });

        it("Should not mark fully repaid loan as default", async () => {
            const loan = await loanManager.getLoanDetails(borrower1.address);
            await loanManager.connect(borrower1).repayLoan(loan.totalOwed);

            await time.increase(LOAN_DURATION + 1);

            await expect(
                loanManager.markAsDefault(borrower1.address)
            ).to.be.revertedWith("Loan is not active");
        });

        it("Should check if loan is overdue correctly", async () => {
            expect(await loanManager.isLoanOverdue(borrower1.address)).to.be.false;

            await time.increase(LOAN_DURATION + 1);

            expect(await loanManager.isLoanOverdue(borrower1.address)).to.be.true;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update min credit score", async () => {
            const newMinScore = 700;
            await expect(loanManager.connect(owner).setMinCreditScore(newMinScore))
                .to.emit(loanManager, "MinCreditScoreUpdated")
                .withArgs(newMinScore);

            expect(await loanManager.minCreditScore()).to.equal(newMinScore);
        });

        it("Should allow owner to update max loan amount", async () => {
            const newMaxAmount = ethers.parseUnits("20000", 6);
            await expect(loanManager.connect(owner).setMaxLoanAmount(newMaxAmount))
                .to.emit(loanManager, "MaxLoanAmountUpdated")
                .withArgs(newMaxAmount);

            expect(await loanManager.maxLoanAmount()).to.equal(newMaxAmount);
        });

        it("Should allow owner to update loan duration", async () => {
            const newDuration = 60 * 24 * 60 * 60; // 60 days
            await expect(loanManager.connect(owner).setLoanDuration(newDuration))
                .to.emit(loanManager, "LoanDurationUpdated")
                .withArgs(newDuration);

            expect(await loanManager.defaultLoanDuration()).to.equal(newDuration);
        });

        it("Should allow owner to update base interest rate", async () => {
            const newRate = 800; // 8%
            await expect(loanManager.connect(owner).setBaseInterestRate(newRate))
                .to.emit(loanManager, "BaseInterestRateUpdated")
                .withArgs(newRate);

            expect(await loanManager.baseInterestRate()).to.equal(newRate);
        });

        it("Should reject non-owner admin calls", async () => {
            await expect(
                loanManager.connect(borrower1).setMinCreditScore(700)
            ).to.be.reverted;
        });

        it("Should reject invalid parameter updates", async () => {
            await expect(
                loanManager.connect(owner).setMinCreditScore(1001)
            ).to.be.revertedWith("Score must be <= 1000");

            await expect(
                loanManager.connect(owner).setMaxLoanAmount(0)
            ).to.be.revertedWith("Amount must be > 0");
        });
    });

    describe("Eligibility Check", function () {
        it("Should return eligible for borrower with good credit", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);

            const [eligible, reason] = await loanManager.checkEligibility(borrower1.address);
            expect(eligible).to.be.true;
            expect(reason).to.equal("Eligible for loan");
        });

        it("Should return ineligible for borrower with low credit score", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 500);

            const [eligible, reason] = await loanManager.checkEligibility(borrower1.address);
            expect(eligible).to.be.false;
            expect(reason).to.equal("Credit score too low");
        });

        it("Should return ineligible for borrower with active loan", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));

            const [eligible, reason] = await loanManager.checkEligibility(borrower1.address);
            expect(eligible).to.be.false;
            expect(reason).to.equal("Active loan already exists");
        });

        it("Should return eligible after loan is repaid", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));

            const loan = await loanManager.getLoanDetails(borrower1.address);
            // Approve for repayment
            await usdt.connect(borrower1).approve(await loanManager.getAddress(), loan.principal);
            await loanManager.connect(borrower1).repayLoan(loan.totalOwed);

            const [eligible, reason] = await loanManager.checkEligibility(borrower1.address);
            expect(eligible).to.be.true;
            expect(reason).to.equal("Eligible for loan");
        });
    });

    describe("View Functions", function () {
        it("Should return correct remaining debt", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            await loanManager.connect(borrower1).requestLoan(ethers.parseUnits("1000", 6));

            const loan = await loanManager.getLoanDetails(borrower1.address);
            expect(await loanManager.getRemainingDebt(borrower1.address)).to.equal(loan.totalOwed);

            const repayAmount = ethers.parseUnits("300", 6);
            // Approve for principal payment
            await usdt.connect(borrower1).approve(await loanManager.getAddress(), loan.principal);
            await loanManager.connect(borrower1).repayLoan(repayAmount);

            expect(await loanManager.getRemainingDebt(borrower1.address)).to.equal(loan.totalOwed - repayAmount);
        });

        it("Should return zero remaining debt for no loan", async () => {
            expect(await loanManager.getRemainingDebt(borrower1.address)).to.equal(0);
        });

        it("Should return complete loan details", async () => {
            await creditScore.connect(oracle).updateScore(borrower1.address, 750);
            const loanAmount = ethers.parseUnits("1000", 6);
            await loanManager.connect(borrower1).requestLoan(loanAmount);

            const loan = await loanManager.getLoanDetails(borrower1.address);
            expect(loan.principal).to.equal(loanAmount);
            expect(loan.status).to.equal(1); // Active
            expect(loan.amountRepaid).to.equal(0);
        });
    });
});
