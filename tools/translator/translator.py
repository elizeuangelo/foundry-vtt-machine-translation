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

file_name = {"pt": "pt-BR"}
translation_name = {"cn": "zh-CN"}


def load(file):
    '''
    Loads a json file and return its contents.
    '''
    buffer = open(file, "r", encoding="utf-8")
    loaded = json.load(buffer)
    buffer.close()
    return loaded


def save(dict_translation, output_lang):
    '''
    Save a dictionary as a json file inside `output/lang` using the output_lang as its name.
    '''
    if output_lang not in file_name.keys():
        file_name[output_lang] = output_lang
    outputfile = file_name[output_lang] + ".json"
    file = open("output/lang/" + outputfile, "w", encoding="utf-8")
    json.dump(dict_translation, file, ensure_ascii=False, indent="    ")
    file.close()
    return outputfile


def translate(loaded, input_lang="en", output_lang="pt", references={}):
    '''
    Translate all references in a dictionary to the output_lang.
    '''
    if output_lang not in translation_name.keys():
        translation_name[output_lang] = output_lang
    output_dict = {}
    for key, value in loaded.items():
        if key in references:
            output_dict[key] = references[key]
        else:
            for translator, name in translators:
                try:
                    output_dict[key] = translator(value,
                                                  from_language=input_lang,
                                                  to_language=translation_name[output_lang])
                    break
                except Exception as error:
                    print(
                        f"Problem in translating ({name}): input: {input_lang} /" /
                        f"output: {output_lang} / {key}:{value} / ERROR: {error}"
                    )
                    print("Trying again with next translator...")

    return output_dict


if __name__ == "__main__":
    lang_list = [
        "cn", "de", "es", "fr", "it", "ja", "ko", "pl", "pt", "ru", "th"
    ]
    lang_src = "en"
    if len(argv) > 1:
        lang_src = argv[1]
    if len(argv) > 2:
        lang_list = argv[2].split(",")
    lang_src_file = "input/" + lang_src + ".json"
    references = {}
    for lang in lang_list:
        if lang not in file_name.keys():
            file_name[lang] = lang
        try:
            references[lang] = load("input/" + file_name[lang] + ".json")
            print(f"Found {lang} references file")
        except:
            pass
    input_json = load(lang_src_file)
    f = open("module.json", "r", encoding="utf-8")
    module_reading = json.load(f)
    f.close()
    module_output = {"languages": []}
    print(lang_list)
    for lang in lang_list:
        if lang in references:
            translation = translate(input_json, lang_src, lang,
                                    references[lang])
        else:
            translation = translate(input_json, lang_src, lang)
        file_output = save(translation, lang)
        print(
            f'Translated {lang_src} to {lang}! "output/{file_output}" created. Done!'
        )
    for lang in module_reading["languages"]:
        if lang["lang"] in lang_list + [lang_src]:
            module_output["languages"].append(lang)
    f = open("output/info.json", "w", encoding="utf-8")
    json.dump(module_output, f, ensure_ascii=False, indent="\t")
    f.close()
    copyfile(lang_src_file, "output/lang/" + lang_src + ".json")
