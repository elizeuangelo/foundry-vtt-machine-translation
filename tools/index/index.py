'''
This script searches for all js/ts documents inside the `./input` folder and
creates an empty json containing all references in `./output`.
'''
from os import walk
from sys import argv
import re
import simplejson as json


if __name__ == "__main__":
    #REGEX = r"""(game\.i18n\.localize\()(?:"(.*?)"|'(.*?)'|`(.*?)`)\)"""
    REGEX = r"""(?:(game\.i18n\.localize\()(?:"(.*?)"|'(.*?)'|`(.*?)`)\)|"""\
        """localize (?:"(.*?)"|'(.*?)'|`(.*?)`))"""
    references = {}
    output = 'en'
    alphabetical = False
    if len(argv) > 1:
        for arg in argv[1:]:
            if arg in ('-a', '-A'):
                print('Sorting alphabetically.')
                alphabetical = True
            else:
                output = arg
    for root, dirs, files in walk('./input', topdown=False):
        print(root, dirs, files)
        for file in files:
            with open(root + '\\' + file, 'r') as f:
                matches = re.findall(REGEX, f.read())
                for match in matches:
                    string = match[1]+match[2]+match[3] + \
                        match[4]+match[5]+match[6]
                    references[string] = ""
    print(f'Found a total of {len(references)} i18n references')
    f = open(f'./output/{output}.json', 'w', encoding='utf-8')
    json.dump(references, f, ensure_ascii=False,
              indent='\t', sort_keys=alphabetical)
    f.close()
