# Foundry VTT - Machine Translation

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/elizeuangelo/foundry-vtt-machine-translation)

#### Donations

##### Crypto

[![BTC](https://img.shields.io/badge/bitcoin-gold.svg)](https://blockchair.com/bitcoin/address/bc1qtyy30h4d7yc6d3pjwmu46mpqxw7v50jnsq5sk9)
[![ADA](https://img.shields.io/badge/Cardano-9cf.svg)](https://cardanoscan.io/address/addr1qy32u0vthhy76mdck84nanw6d8t2ufrhv3pzulycp75lcp6jfmzvguq883d96hq5cmys2h28hmqfpjyfz4ceuw29h33sa3t5mf)
[![ETH](https://img.shields.io/badge/ethereum-silver.svg)](https://blockchair.com/ethereum/address/0xa9c30d78f6ba250523289090bcc55832eda19a16)
[![LTC](https://img.shields.io/badge/litecoin-lightgrey.svg)](https://blockchair.com/litecoin/address/LbB43DHAny9CShT5yL6Fc62SMXQUvZVEtZ)
[![DOGE](https://img.shields.io/badge/doge-yellow.svg)](https://blockchair.com/dogecoin/address/DPmkqoDc25YeLhSK2LbQyvyi1yP5f4JvDh)

##### Others

[![ko-fi](https://img.shields.io/badge/Kofi-red.svg)](https://ko-fi.com/B0B024E6C)
[![BuyCoffee](https://img.shields.io/badge/coffee-%243-orange)](https://www.buymeacoffee.com/j6auA0z)

Some python3 scripts for Foundry VTT developers to easily translate their packages in all core foundry's core languages

## Installation

1. Clone the repository or [download the zip](https://github.com/elizeuangelo/foundry-vtt-machine-translation/archive/refs/tags/v1.0.zip)

```
git clone https://github.com/elizeuangelo/foundry-vtt-machine-translation.git
```

2. Create and activate an virtual environment (optional)

```
python -m venv .

<windows>
Scripts\activate.bat

<linux>
source Scripts/activate
```

3. Install the requirements

```
pip install -r requirements.txt
```

## How to Use

### index.py [-aA] [output-file]

This script searches for all js/ts documents inside the `.\input` folder and creates an empty json containing all references in `.\output`.

**-a or -A**:
Sorts out the references alphabetically.

**[output-file]** = `en`:
Specifies the output json generated, defaults as `en`.

### translator.py [from_language] [to_languages]

This script is used to generate all languages files existing in core Foundry based on a single file containing all the references: `[from_language].json`.

It works like this, first it reads `.\input` folder for the `[from_language].json` file, wich will be the base for all translations. Every other `[to_language].json` file inside that folder will be read as well to ignore already existing references, this way those references will not be replaced by machine translation.

As items are being translated, `[to_language].json` files are generated inside the `.\output` folder, as well as an `info.json` file. This file contains an easy copy and paste `"languages"` object to put inside a module's `manifest.json`, containing all `to_languages` used in the project.

**[from_language]** = `en`:
The base language, needs an analogous `[from_language].json` file inside the `.\input` folder.

**[to_languages]** = `cn,de,es,fr,it,ja,ko,pl,pt,ru,th`:
Specifies the output languages included in the module.

## License

This module is made by elizeuangelo and it is licensed under a Mozilla Public License Version 2.0.
