---
layout: post
title: Product embedding with fasttext, have you tried ?
excerpt: Treat an order like a sentence and a product's attributes like sub-words, and NLP embeddings work wonders for e-commerce.
---

![image](/images/embedding.png )
<center><em>Can product attributes make product embeddings better?</em></center>

Word embeddings have been around for quite a while. In this post, I apply the same tricks to products in an online store, and show why fasttext in particular is a great fit.

## How word embeddings work

Word2vec (and GloVe) learn vectors for words from the sentences they appear in. The idea is simple: words that show up in the same context probably mean similar things. So you train a model to predict whether a word appears in some neighborhood of other words (a bag of words, BOW). This idea carried over to later embedding models, and it turned out to find real linear structure in a corpus.

![image](/images/acat.jpg )
<center><em>A cat picture to keep you engaged and happy.</em></center>

## Word2vec for products

In e-commerce, you have orders, and an order is just a list of products: a bag of products. So you can train the same kind of model to predict whether an item belongs in a bag of products, and you get a pretty nice product embedding out of it.

In theory, this fits products even better than it fits words. A bag of words is a crude model of a sentence, because word order and grammar carry so much meaning. An order really is just the sum of the products in it.

![image](/images/bart-is-right.png )
<center><em>Tis but a meme Sire!</em></center>

## Fasttext for products

Word2vec only gets you so far, though. It's known to struggle with rare words, and in our setting that means products people rarely buy. That's where fasttext comes in.

Fasttext assumes that words built from the same root are related. "Suggestion" and "suggesting" both come from "suggest". By learning from these sub-word pieces, fasttext trains better embeddings, especially for rare words, and it can even build a decent vector for a word it has never seen by combining its pieces. That's handy for noisy text like tweets.

The same idea works for products. Describe each product by its attributes:

	Example: Product_12123  ~ T-shirt + Blue Color + brand Nike + Dry Fit + ...

Now the attributes play the role of sub-words. A rarely bought T-shirt still shares "Nike" and "Dry Fit" with lots of popular products, so it gets a much more precise embedding.

## Training the model

Gensim is one of the most popular libraries for training word2vec and fasttext, and the one I know and love. Right now it has no way to tell it exactly which attributes make up each product. You need a custom Cython function for that, but luckily it's not that complex.

## A fun side effect

Remember the most famous word2vec example: king - man + woman = queen. It suggests there's a direction in the embedding space that means "king-ness".

Product embeddings have directions like that too: cheapness, blue-ness and so on. That's very useful for recommendation engines. For example, you can find a cheaper replacement for a product by moving along the cheapness direction.

Update: here's an [example notebook](https://github.com/VuongNM/study/blob/main/Product%20Embedding%20with%20Word2vec%20and%20Fasttext.ipynb), using a public dataset from [Kaggle](https://www.kaggle.com/competitions/h-and-m-personalized-fashion-recommendations).
