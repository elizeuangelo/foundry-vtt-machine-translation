'''
This script is used to generate all languages files existing in core Foundry
based on a single file containing all the references: `[from_language].json`.

It works like this, first it reads `./input` folder for the `[from_language].json` file,
wich will be the base for all translations. Every other `[to_language].json` file inside
that folder will be read as well to ignore already existing references, this way those
references will not be replaced by machine translation.

As items are being translated, `[to_language].json` files are generated inside the
`./output` folder, as well as an `info.json` file. This file contains an easy copy and
paste `"languages"` object to put inside a module's `manifest.json`, containing all
`to_languages` used in the project.
'''
from sys import argv
from shutil import copyfile
import translators as ts
import simplejson as json


# Choose the translator service
translators = ((ts.bing, "Bing"), (ts.google, "Google"))


def load(file):
    '''
    Loads a json file and return its contents.
    '''
    buffer = open(file, "r")
    loaded = json.load(buffer)
    buffer.close()
    return loaded


def save(dict_translation, output_lang):
    '''
    Save a dictionary as a json file inside `output/lang` using the output_lang as its name.
    '''
    mutations = {"pt": "pt-BR"}
    if output_lang in mutations.keys():
        outputfile = mutations[output_lang] + ".json"
    else:
        outputfile = output_lang + ".json"
    file = open("output/lang/" + outputfile, "w", encoding="utf-8")
    json.dump(dict_translation, file, ensure_ascii=False, indent="    ")
    file.close()
    return outputfile


def translate(loaded, input_lang="en", output_lang="pt", references={}):
    '''
    Translate all references in a dictionary to the output_lang.
    '''
    output_dict = {}
    for key, value in loaded.items():
        if key in references:
            output_dict[key] = references[key]
        else:
            for translator, name in translators:
                try:
                    output_dict[key] = translator(value,
                                                  from_language=input_lang,
                                                  to_language=output_lang)
                    break
                except Exception as error:
                    print(
                        f"Problem in translating ({name}): input: {input_lang} / output: {output_lang} / {key}:{value} / ERROR: {error}"
                    )
                    print("Trying again with next translator...")

    return output_dict


if __name__ == "__main__":
    langList = [
        "cn", "de", "es", "fr", "it", "ja", "ko", "pl", "pt", "ru", "th"
    ]
    lang_src = "en"
    if len(argv) > 1:
        lang_src = argv[1]
    if len(argv) > 2:
        langList = argv[2].split(",")
    lang_src_file = "input/" + lang_src + ".json"
    references = {}
    for lang in langList:
        try:
            references[lang] = load("input/" + lang + ".json")
            print(f"Found {lang} references file")
        except:
            pass
    inputJSON = load(lang_src_file)
    f = open("module.json", "r", encoding="utf-8")
    moduleReading = json.load(f)
    f.close()
    moduleOutput = {"languages": []}
    print(langList)
    for lang in langList:
        mutations = {"cn": "zh-CN"}
        if lang in mutations.keys():
            input_lang = mutations[lang]
        else:
            input_lang = lang
        if lang in references:
            translation = translate(inputJSON, lang_src, input_lang,
                                    references[lang])
        else:
            translation = translate(inputJSON, lang_src, input_lang)
        file_output = save(translation, lang)
        print(
            f'Translated {lang_src} to {lang}! "output/{file_output}" created. Done!'
        )
    for lang in moduleReading["languages"]:
        if lang["lang"] in langList + [lang_src]:
            moduleOutput["languages"].append(lang)
    f = open("output/info.json", "w", encoding="utf-8")
    json.dump(moduleOutput, f, ensure_ascii=False, indent="\t")
    f.close()
    copyfile(lang_src_file, "output/lang/" + lang_src + ".json")
