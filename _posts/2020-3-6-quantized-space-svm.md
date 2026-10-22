---
layout: post
title: Quantized space SVM
excerpt: Bin your data before training a kernel SVM. You keep the decision boundary and drop most of the points.
---

Kernel SVMs are lovely until your dataset gets big. Training one compares every pair of points, so the work and the memory both grow as O(n^2). With 100,000 points, that gives you a headache.

In this post (and its [notebook](https://github.com/VuongNM/featurebinning/blob/master/featbin.ipynb)), I shrink the dataset with feature binning before training, and the SVM barely notices.

![image](/images/output_6_2.png )
<center><em>Left: a synthetic two-class dataset with 100,000 points and moderate noise. Right: the kernel SVM trained on all of them.</em></center>

## The idea

Cut the feature space into buckets (bins). Every sample that lands in the same bucket gets replaced by one representative point: the bucket itself, or the average of the samples in it. If your SVM implementation supports sample weights, use the number of samples in each bucket as the weight.

Instead of n points, you now train on at most one point per occupied bucket and class. That's a drastic reduction.

You do pay for it: the density of the binned samples is no longer the density of the original data. But an SVM cares about the decision boundary, not the density, so for this job the trade is worth it.

## Doing it with KBinsDiscretizer

Sklearn's `KBinsDiscretizer` does the binning. With 100 bins per feature, the 100,000 samples shrink to roughly 5,000.

There are a few ways to place the bins. I use uniform bins, where every bucket is the same size. (With quantile bins, every bucket holds the same number of points instead.) Uniform bins spread the remaining samples out evenly.

![image](/images/output_10_2.png )
<center><em>The same data after binning: about 5,000 points on an even grid, and the SVM finds the same boundary.</em></center>

Look at the inner part of the point cloud: the points now sit on an even grid, and the decision boundary on the right looks just like the one trained on all 100,000 points.

## When not to use it

This doesn't work out of the box with methods that rely on density, like Gaussian Processes. Binning changes the density, so density estimates from the binned data can be wrong. I bet there are weighting tricks to fix that :)
