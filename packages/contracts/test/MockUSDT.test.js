const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockUSDT", function () {
  let mockUSDT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await mockUSDT.owner()).to.equal(owner.address);
    });

    it("Should assign initial supply to owner", async function () {
      const ownerBalance = await mockUSDT.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseUnits("1000000", 6));
    });

    it("Should have correct decimals", async function () {
      expect(await mockUSDT.decimals()).to.equal(6);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to address", async function () {
      const mintAmount = ethers.parseUnits("1000", 6);
      await mockUSDT.mint(addr1.address, mintAmount);
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should fail if non-owner tries to mint", async function () {
      const mintAmount = ethers.parseUnits("1000", 6);
      await expect(
        mockUSDT.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.reverted;
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("100", 6);
      await mockUSDT.transfer(addr1.address, transferAmount);
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should update balances after transfer", async function () {
      const transferAmount = ethers.parseUnits("100", 6);
      const initialOwnerBalance = await mockUSDT.balanceOf(owner.address);

      await mockUSDT.transfer(addr1.address, transferAmount);
      await mockUSDT.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await mockUSDT.balanceOf(owner.address)).to.equal(
        initialOwnerBalance - transferAmount
      );
      expect(await mockUSDT.balanceOf(addr1.address)).to.equal(0);
      expect(await mockUSDT.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const transferAmount = ethers.parseUnits("1", 6);
      await expect(
        mockUSDT.connect(addr1).transfer(owner.address, transferAmount)
      ).to.be.reverted;
    });
  });
});
