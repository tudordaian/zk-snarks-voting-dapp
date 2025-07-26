# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```


<!-- COMENZI DEPLOY -->
```shell
# HARDHAT FOLOSESTE VERSIUNEA CURRENT LTS DE NODE 
# ca sa schimbi versiunea de node la versiunea compatibila: 
nvm use 22

# Inainte de toate, fa un clean si un compile:
npx hardhat clean (optional)
npx hardhat compile

# Ca sa dai deploy la SC intr-un Hardhat Network la care te poti conecta cu wallet + client dapp:
npx hardhat node    # creaza un contract in terminal, pt alte comenzi deschide un terminal nou
npx hardhat ignition deploy ./ignition/modules/ProjectPollLedger.ts --network localhost


# Ca sa creezi network-ul pe un anumit port si sa accepte requesturi de la un anumit host:
npx hardhat node --hostname 127.0.0.1 --port 8545
# Ca network-ul sa accepte requesturi de la orice adresa:
npx hardhat node --hostname 0.0.0.0

# Ca sa rulezi fisierele de TEST:
npx hardhat test
npx hardhat test test/sc-test.ts # ruleaza fisiere individual
npx hardhat test --network localhost # ruleaza pe un anumit network
```