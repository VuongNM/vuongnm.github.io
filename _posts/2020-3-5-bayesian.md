---
layout: post
title: Rooting for Bayes
excerpt: Bayesian > Frequentist. Change my mind!
---

Experiment time! Put your lab coat on, protective glasses are a must. This is a dangerous experiment and the result will blow you away!

The experiment starts at 8:00 AM. Everybody looks tense.

Vuong takes a coin out of his tight jeans, flips it 100 times and records the number of heads he received (from the coin, not from anybody else). Then he calculates the probability of the coin turning up heads: p = (number of heads) / 100.

Bravo!! He has just run the famous Bernoulli trials. Everybody is excited. Hundreds of years after the first trials, his methodology is just perfect.

Then he does it again, and again, and again. After a few hours, he has done thousands of them. Everybody is pleased with his consistency. The coin always lands on the table, heads or tails.

Just before lunch, he calculates the symmetric confidence interval for his experiment.

In the afternoon, he repeats the experiments many more times (he gets more done after lunch, because a morning bird he is not, and the jeans are tight, as I told you).

He comes to a conclusion: 95% of the time, the true probability of heads falls inside the confidence interval he calculated. So he is 95% confident that each interval contains the true probability of landing heads.

The room goes through the roof. Everybody claps and cheers. KDnuggets and Towards Data Science rush into the lab and write down the results. The museum down the road wants the coin on its wall.

## Then Scott asks a question

Scott, in the corner, raises his hand: "Hey Vuong, what's the probability that the coin's true heads rate is between 0.499 and 0.501? In the end, the coin is a physical object, so it has one fixed heads rate. Amma right?"

Vuong, proud Frequentist that he is, gets pissed off. He knows there is no philosophically sound answer to that question in his framework. For him, a confidence interval only means something over an infinite number of repeated experiments, and he doesn't have time to run those. It says nothing about the probability of the coin's true rate sitting in any particular range.

Vuong looks tense now. He is embarrassed in front of everybody, especially the starry-eyed girls.

He jumps to the side, pulls out a giant block of sodium the size of a plate that he always keeps in the lab fridge, and tosses it into the water.

BAM!!!! The lab explodes! Everybody crawls out. Smoke is everywhere. Told you experimenting with Vuong is dangerous.

![image](/images/whistle.png)

Vuong disappears for 3 months. Then somebody spots him at the Bayesian School of Probability and Statistics, right in front of the museum across the road.

Because Scott's question is the one people actually want answered, and only a Bayesian can answer it directly: put a prior on the heads rate, update it with the flips, and read the probability of [0.499, 0.501] straight off the posterior.
