import json
import nltk
import sys
sentence = sys.argv[1]
tokens = nltk.word_tokenize(sentence)
tagged = nltk.pos_tag(tokens)
print(json.dumps(tagged))