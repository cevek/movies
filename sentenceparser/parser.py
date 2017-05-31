import json
import nltk
import sys
import base64
sentence = base64.b64decode(sys.argv[1])
#print(sentence)
tokens = nltk.word_tokenize(sentence)
tagged = nltk.pos_tag(tokens)
print(json.dumps(tagged))