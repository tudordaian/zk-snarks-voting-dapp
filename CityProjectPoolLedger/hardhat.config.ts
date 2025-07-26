import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: [{ privateKey: process.env.ADMIN_METAMASK_PRIVATE_KEY!, balance: '10000000000000000000000' }],
    },
    besu: {
      url: 'http://localhost:8545',
      accounts: [process.env.ADMIN_METAMASK_PRIVATE_KEY!],
      chainId: 1337,
      gasPrice: 0,
      gas: 'auto'
    }
  },
  defaultNetwork: 'besu'
};

export default config;
