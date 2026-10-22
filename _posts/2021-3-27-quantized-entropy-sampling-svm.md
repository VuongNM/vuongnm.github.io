---
layout: post
title: Quantized space SVM with entropy based sampling
excerpt: Pick the points to train an SVM on by the entropy of the space around them. 500 points do the job of 100,000.
---

![image](/images/quantized-kernel-svm.png )
<center><em>Training an SVM on a much smaller dataset, sampled from the original using entropy.</em></center>

This is part 2 of my series on representing points with a quantized space. In [part 1](/quantized-space-svm/), I trained an SVM on binned samples and cut the training time by orders of magnitude. Here I push it to the extreme: how few points can the SVM get away with?

## Why an SVM can afford to drop points

An SVM's decision boundary is shaped mostly by the points close to it. The further a point is from the boundary, the less it matters. That's what makes SVMs robust.

Not every model works like this. Logistic regression, and other models trained with gradient descent, listen to every point, so outliers can push them around easily.

So if I can find the points near the boundary and keep mostly those, I can throw the rest away. The question is how to find them without training the SVM first. That's one of the most fundamental questions for SVMs: which datapoints to train on.

## Entropy finds the boundary

Entropy measures how mixed a distribution is. It's lowest when everything is the same, and highest when everything has an equal share. From an information theory point of view, it's the amount of information you need to encode that distribution.

Now cut the space into cells and look at the labels inside each one. A cell deep inside one class holds a single label, so its entropy is close to zero. A cell on the decision boundary holds both labels, so its entropy is high. That makes the entropy of the space around a point a good proxy for how much that point matters to the decision function.

Another way to see it: imagine throwing away everything you know about the points in a cell and labeling all of them with the cell's most common label. The information you lose is the entropy. Near the boundary you lose a lot, so you should keep those points.

## The experiment

I use sklearn's `KBinsDiscretizer` to cut the space into a grid of cells, then resample the points based on the entropy of their cell: the higher the entropy, the more likely a point gets picked. Cells with only one label get a small sampling probability, so a few points from the middle of each cloud still make it in.

{:refdef: style="text-align: center;"}
![image](/images/svm-moon.png )
{: refdef}
<center><em>A kernel SVM on all 100,000 points. It takes a long time to train.</em></center>

Now the same kernel SVM on only 500 of those 100,000 points. The orange and teal dots are the sampled points.

![image](/images/svm-moon-sampled.png )
<center><em>The SVM on just 500 points. Most of the sampled points sit near the decision boundary.</em></center>

## Notes

You could compute the same entropy with a nearest neighbor method, but that's far more expensive, and the whole point here is to make SVMs faster.

The method has two knobs: the width of the cells and the base sampling probability. You can tune both with cross validation. More on that later.
