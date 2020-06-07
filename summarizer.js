'use strict';

const getSentencesFromArticle = require('get-sentences-from-article');
const natural = require('natural'); 
const tokenizer = new natural.WordTokenizer();
const stopWords = ['a', 'the', 'to', 'when', 'about', 'by', 'and', 'with'];

/**************************************************************************
Normalize the words into every sentence
1. Extract the words out of it
2. Apply stemming 
3. Remove the stop words
**************************************************************************/

var isStopWord = function (word) {
	for(var i in stopWords) {
		if(stopWords[i] === word) {
			return true;
		}
	}
	return false;
}

var removeEqualWords = function (words) {
	for(var i = 0; i < words.length; i++) {
		for(var j = i + 1; j < words.length; j++) {
			if(words[i] === words[j]) {
				var head = words.slice(0,j);
				var tail = words.slice(j+1);
				words = head.concat(tail);
				j = j - 1;
			}
		}
	}
	return words;
}

var normalizing = function (sentence) {
	var words = tokenizer.tokenize(sentence);
	for(var i in words) {
		if(isStopWord(words[i])) {
			words.splice(i, 1);
			continue;
		}
		words[i] = natural.PorterStemmer.stem(words[i]);
	}
	return words;
}

var exists = function(word, array) {
	for(var i = 0; i < array.length; i++) {
		if(array[i] === word) {
			return true;
		}
	}
	return false;
}

var identicalWordsInSentence =  function(list1, list2) {
	var identical = [];
	for(var i = 0; i < list1.length; i ++) {
		for(var j = 0; j < list2.length; j++) { 
			if(list1[i] === list2[j] && !(exists(list1[i], identical))) {
				identical.push(list1[i]);
			}
		}
	}
	return identical;
}

const jaccardSimilarity =  function (sentence1, sentence2) {
	var a = normalizing(sentence1);
	var b = normalizing(sentence2);
	var identical = identicalWordsInSentence(a, b);
	var result = (identical.length / (a.length + b.length - identical.length));
	return result;
}

exports.summaryWithQuestion = function(question, text, numberSentences) {
  var weigthedSentences = new Array();
  var sentences = getSentencesFromArticle(text);
  if (sentences) {
    for (var i = 0; i < sentences.length; i++) {
      weigthedSentences.push({
        index: i,
        sentence: sentences[i],
        weight: jaccardSimilarity(question, sentences[i])
      });
    }
    var sortedArray = weigthedSentences.sort(function(a, b) {
      return b.weight - a.weight;
    })
    .slice(0, numberSentences)
    .sort(function (a, b) {
      return a.index - b.index;
    });

    var result = '';
    for(var i = 0; i < sortedArray.length; i++) {
      result = result + sortedArray[i]['sentence'] + ' ';
    }
    return result;
  } else {
    return []
  }
}

exports.summary = function(text, numberSentences) {
  var weigthedSentences = new Array();
  var sentences = getSentencesFromArticle(text);
  if (sentences) {
    for (var i = 0; i < sentences.length; i++) {
      weigthedSentences.push({
        index: i,
        sentence: sentences[i],
        weight: jaccardSimilarity(sentences[0], sentences[i])
      });
    }
    var sortedArray = weigthedSentences.sort(function(a, b) {
      return b.weight - a.weight;
    })
    .slice(0, numberSentences)
    .sort(function (a, b) {
      return a.index - b.index;
    });

    var result = '';
    for(var i = 0; i < sortedArray.length; i++) {
      result = result + sortedArray[i]['sentence'] + ' ';
    }
    return result;
  } else {
    return []
  }
}