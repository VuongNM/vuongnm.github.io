---
layout: post
title: Typical Sets and why you should not start MCMC chain from MAP
excerpt: Using MAP as chain starting point is just premature optimization of Monte Carlo methods.

---

A common trick for MCMC is to start the chains at the MAP, the single most likely point. It sounds smart: start where the probability is highest. In high dimensions, it's a waste of time, and this post shows why.

## In high dimensions, almost nothing is near the peak

Take a standard Normal distribution in d dimensions. Draw a point and measure its distance to the origin. The squared distance follows a Chi-square distribution, so the distance itself follows a Chi distribution.

The Chi distribution depends only on d, and its peak moves out roughly as sqrt(d). So as d grows, the points stop clustering around the mean. They end up in a thin shell between two hyperspheres, about sqrt(d) away from the center.

![image](/images/chi.png)
<center><em>The Chi distribution for 1, 10, 100 and 500 dimensions. Each peak sits further from zero.</em></center>

Still not convinced? Here are the actual distances to the origin of points drawn from a standard multivariate Normal ([source](https://gist.github.com/VuongNM/085b256f41e1241ad7032662fb9cc421)):

![image](/images/norm_dist.png)

In 1 dimension, most points are close to 0. In 100 dimensions, they're about 10 away, and in 500 dimensions about 22 away. Almost none are anywhere near the center, which is where the MAP lives.

## So don't start at the MAP

For MCMC, you want your chains to explore the region where the bulk of the probability is. That region is the shell above, and it's called the Typical Set.

The MAP sits at the center, outside the Typical Set. Starting there is premature optimization: it buys you nothing, and your chains have to travel out to the shell before they sample anything useful, which can make things worse. Modern MCMC frameworks like PyMC3 have their own tricks to start the chains in a way that reaches the typical set efficiently. Let them do it.

![image](/images/lucia.png)
<center><em>Lucia Popp looking at you when you initialize your chains with MAP</em></center>
