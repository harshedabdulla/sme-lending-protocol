const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
    let usdt, pool, owner, lender, borrower, loanManager;

    beforeEach(async () => {
        [owner, lender, borrower, loanManager] = await ethers.getSigners();

        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy();
        await usdt.waitForDeployment();

        const LendingPool = await ethers.getContractFactory("LendingPool");
        pool = await LendingPool.deploy(await usdt.getAddress());
        await pool.waitForDeployment();

        await pool.connect(owner).setLoanManager(loanManager.address);

        // Mint USDT to lender and borrower
        await usdt.mint(lender.address, ethers.parseUnits("1000", 18));
        await usdt.mint(borrower.address, ethers.parseUnits("1000", 18));

        // Lender approves pool
        await usdt.connect(lender).approve(pool.getAddress(), ethers.parseUnits("1000", 18));
    });

    it("should allow deposit", async () => {
        await pool.connect(lender).deposit(ethers.parseUnits("100", 18));
        const dep = await pool.deposits(lender.address);
        expect(dep).to.equal(ethers.parseUnits("100", 18));
    });

    it("should disburse loan (by loan manager)", async () => {
        await pool.connect(lender).deposit(ethers.parseUnits("200", 18));
        await pool.connect(loanManager).disburseLoan(borrower.address, ethers.parseUnits("50", 18));
        const loan = await pool.loans(borrower.address);
        expect(loan).to.equal(ethers.parseUnits("50", 18));
    });

    it("should receive repayment", async () => {
        await pool.connect(lender).deposit(ethers.parseUnits("200", 18));
        await pool.connect(loanManager).disburseLoan(borrower.address, ethers.parseUnits("50", 18));

        // borrower repays
        await usdt.connect(borrower).approve(pool.getAddress(), ethers.parseUnits("50", 18));
        await pool.connect(borrower).receiveRepayment(borrower.address, ethers.parseUnits("50", 18));

        const loan = await pool.loans(borrower.address);
        expect(loan).to.equal(0);
    });
});
