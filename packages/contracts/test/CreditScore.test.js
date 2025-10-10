const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CreditScore", function () {
  async function deployCreditScoreFixture() {
    const [admin, oracle, user1, user2, user3, nonOracle] = await ethers.getSigners();

    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = await CreditScore.deploy(oracle.address);
    await creditScore.waitForDeployment();

    return { creditScore, admin, oracle, user1, user2, user3, nonOracle };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { creditScore, admin } = await loadFixture(deployCreditScoreFixture);
      const DEFAULT_ADMIN_ROLE = await creditScore.DEFAULT_ADMIN_ROLE();
      expect(await creditScore.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should grant oracle role to initial oracle", async function () {
      const { creditScore, oracle } = await loadFixture(deployCreditScoreFixture);
      expect(await creditScore.isOracle(oracle.address)).to.be.true;
    });

    it("Should revert if initial oracle is zero address", async function () {
      const CreditScore = await ethers.getContractFactory("CreditScore");
      await expect(CreditScore.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid oracle address"
      );
    });
  });

  describe("Update Score", function () {
    it("Should allow oracle to update score", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await expect(creditScore.connect(oracle).updateScore(user1.address, 750))
        .to.emit(creditScore, "ScoreUpdated")
        .withArgs(user1.address, 750, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

      expect(await creditScore.getScore(user1.address)).to.equal(750);
    });

    it("Should allow multiple score updates for same user", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 600);
      expect(await creditScore.getScore(user1.address)).to.equal(600);

      await creditScore.connect(oracle).updateScore(user1.address, 800);
      expect(await creditScore.getScore(user1.address)).to.equal(800);
    });

    it("Should revert if non-oracle tries to update score", async function () {
      const { creditScore, nonOracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(nonOracle).updateScore(user1.address, 750)
      ).to.be.reverted;
    });

    it("Should revert if score is greater than 1000", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(oracle).updateScore(user1.address, 1001)
      ).to.be.revertedWith("Score must be between 0 and 1000");
    });

    it("Should accept score of 0", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 0);
      expect(await creditScore.getScore(user1.address)).to.equal(0);
    });

    it("Should accept score of 1000", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 1000);
      expect(await creditScore.getScore(user1.address)).to.equal(1000);
    });

    it("Should revert if user address is zero", async function () {
      const { creditScore, oracle } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(oracle).updateScore(ethers.ZeroAddress, 750)
      ).to.be.revertedWith("Invalid user address");
    });
  });

  describe("Batch Update Scores", function () {
    it("Should update multiple scores in batch", async function () {
      const { creditScore, oracle, user1, user2, user3 } = await loadFixture(deployCreditScoreFixture);

      const users = [user1.address, user2.address, user3.address];
      const scores = [700, 800, 600];

      await creditScore.connect(oracle).updateScoresBatch(users, scores);

      expect(await creditScore.getScore(user1.address)).to.equal(700);
      expect(await creditScore.getScore(user2.address)).to.equal(800);
      expect(await creditScore.getScore(user3.address)).to.equal(600);
    });

    it("Should emit ScoreUpdated events for each user", async function () {
      const { creditScore, oracle, user1, user2 } = await loadFixture(deployCreditScoreFixture);

      const users = [user1.address, user2.address];
      const scores = [700, 800];

      const tx = await creditScore.connect(oracle).updateScoresBatch(users, scores);
      const receipt = await tx.wait();

      const events = receipt.logs.filter(log => {
        try {
          return creditScore.interface.parseLog(log).name === "ScoreUpdated";
        } catch {
          return false;
        }
      });

      expect(events.length).to.equal(2);
    });

    it("Should revert if arrays length mismatch", async function () {
      const { creditScore, oracle, user1, user2 } = await loadFixture(deployCreditScoreFixture);

      const users = [user1.address, user2.address];
      const scores = [700];

      await expect(
        creditScore.connect(oracle).updateScoresBatch(users, scores)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should revert if arrays are empty", async function () {
      const { creditScore, oracle } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(oracle).updateScoresBatch([], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert if any score is greater than 1000", async function () {
      const { creditScore, oracle, user1, user2 } = await loadFixture(deployCreditScoreFixture);

      const users = [user1.address, user2.address];
      const scores = [700, 1001];

      await expect(
        creditScore.connect(oracle).updateScoresBatch(users, scores)
      ).to.be.revertedWith("Score must be between 0 and 1000");
    });

    it("Should revert if any user address is zero", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      const users = [user1.address, ethers.ZeroAddress];
      const scores = [700, 800];

      await expect(
        creditScore.connect(oracle).updateScoresBatch(users, scores)
      ).to.be.revertedWith("Invalid user address");
    });
  });

  describe("Get Score", function () {
    it("Should return 0 for user with no score", async function () {
      const { creditScore, user1 } = await loadFixture(deployCreditScoreFixture);

      expect(await creditScore.getScore(user1.address)).to.equal(0);
    });

    it("Should return correct score for user", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 850);
      expect(await creditScore.getScore(user1.address)).to.equal(850);
    });
  });

  describe("Get Scores Batch", function () {
    it("Should return scores for multiple users", async function () {
      const { creditScore, oracle, user1, user2, user3 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 700);
      await creditScore.connect(oracle).updateScore(user2.address, 800);
      // user3 has no score

      const users = [user1.address, user2.address, user3.address];
      const scores = await creditScore.getScoresBatch(users);

      expect(scores[0]).to.equal(700);
      expect(scores[1]).to.equal(800);
      expect(scores[2]).to.equal(0);
    });

    it("Should return empty array for empty input", async function () {
      const { creditScore } = await loadFixture(deployCreditScoreFixture);

      const scores = await creditScore.getScoresBatch([]);
      expect(scores.length).to.equal(0);
    });
  });

  describe("Has Minimum Score", function () {
    it("Should return true if user has minimum score", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 750);
      expect(await creditScore.hasMinimumScore(user1.address, 700)).to.be.true;
    });

    it("Should return true if user score equals minimum", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 750);
      expect(await creditScore.hasMinimumScore(user1.address, 750)).to.be.true;
    });

    it("Should return false if user score is below minimum", async function () {
      const { creditScore, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(oracle).updateScore(user1.address, 600);
      expect(await creditScore.hasMinimumScore(user1.address, 700)).to.be.false;
    });

    it("Should return false if user has no score", async function () {
      const { creditScore, user1 } = await loadFixture(deployCreditScoreFixture);

      expect(await creditScore.hasMinimumScore(user1.address, 100)).to.be.false;
    });
  });

  describe("Oracle Management", function () {
    it("Should allow admin to add new oracle", async function () {
      const { creditScore, admin, nonOracle } = await loadFixture(deployCreditScoreFixture);

      await expect(creditScore.connect(admin).addOracle(nonOracle.address))
        .to.emit(creditScore, "OracleAdded")
        .withArgs(nonOracle.address);

      expect(await creditScore.isOracle(nonOracle.address)).to.be.true;
    });

    it("Should allow new oracle to update scores", async function () {
      const { creditScore, admin, nonOracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(admin).addOracle(nonOracle.address);
      await creditScore.connect(nonOracle).updateScore(user1.address, 750);

      expect(await creditScore.getScore(user1.address)).to.equal(750);
    });

    it("Should revert if non-admin tries to add oracle", async function () {
      const { creditScore, nonOracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(nonOracle).addOracle(user1.address)
      ).to.be.reverted;
    });

    it("Should revert when adding zero address as oracle", async function () {
      const { creditScore, admin } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(admin).addOracle(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid oracle address");
    });

    it("Should allow admin to remove oracle", async function () {
      const { creditScore, admin, oracle } = await loadFixture(deployCreditScoreFixture);

      await expect(creditScore.connect(admin).removeOracle(oracle.address))
        .to.emit(creditScore, "OracleRemoved")
        .withArgs(oracle.address);

      expect(await creditScore.isOracle(oracle.address)).to.be.false;
    });

    it("Should prevent removed oracle from updating scores", async function () {
      const { creditScore, admin, oracle, user1 } = await loadFixture(deployCreditScoreFixture);

      await creditScore.connect(admin).removeOracle(oracle.address);

      await expect(
        creditScore.connect(oracle).updateScore(user1.address, 750)
      ).to.be.reverted;
    });

    it("Should revert if non-admin tries to remove oracle", async function () {
      const { creditScore, nonOracle, oracle } = await loadFixture(deployCreditScoreFixture);

      await expect(
        creditScore.connect(nonOracle).removeOracle(oracle.address)
      ).to.be.reverted;
    });
  });

  describe("Is Oracle", function () {
    it("Should return true for oracle address", async function () {
      const { creditScore, oracle } = await loadFixture(deployCreditScoreFixture);

      expect(await creditScore.isOracle(oracle.address)).to.be.true;
    });

    it("Should return false for non-oracle address", async function () {
      const { creditScore, nonOracle } = await loadFixture(deployCreditScoreFixture);

      expect(await creditScore.isOracle(nonOracle.address)).to.be.false;
    });
  });
});
