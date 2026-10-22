---
layout: post
title: On kaggle public - private leaderboard
---

One of the goals of building a machine learning model is to accurately predict the future. 

Since the future is unknown, we machine learning practitioners try to simulate the task in an environment, collecting data that is as informative as possible, building the model that we think is best.



**The purpose of train and test set**

The trainset should represent everything that the model and the practitioner should know about the data, the features types, its observable distribution. Depending on the task and how much generalization is needed, the size and wholeness of the data distribution should be considered. 


The testset, as in the name, is a test of the model's abilities. 

Do we need to test the ability to extrapolate from the partial trainset into the unknown? In Kaggle context, most probably yes. 


Do we need to test the performance of the model, how fast it should run, how easy it is to deploy? For Kaggle, usually no. In real world, yes.


Since the testset represents the unknown, evaluating the model multiple times against it reduces its usefulness as a test set.


The construction of the model validation set should be considered thoroughly. Purposefully making the validation set look like the testset undermines the testset itself, and undermines the task of building the model (how do you make something look like something you don't know? In this case, you're not supposed to know the test set).



**Kaggle Public leaderboard is not that useful**


In the general sense, trainset and testset are randomly split, or is sampled based on some index (time, or space or whatever).


If the public testset is akin to the trainset, then it's redundant. And if the public testset reveals something about the private one, then it's leakage, in the sense that it undermines the true purpose of the (unseen data) testset. 

It's up to the organizer to decide whether the leakage is desirable or not. 

Also, when the public leaderboard testset does not look like the train or test set, the discrepancy creates shakeups and huge disappointment at the end of the day.

This free-to-probe leaderboard data also encourages a trial-and-error kind of approach. I agree that it works. But it also discourages the development of rigorous and well thought out approaches. 



**Solutions**

Get rid of the public leaderboard altogether. All you got there folks is the trainset. That places a big responsibility on the organizer's shoulders to construct a train and test set that makes sense. 

Also, doing so reduces the thrill, the feel of competing and the self-gratification of beating other teams. 

A suggestion would be doing round-based evaluation, say, each week of the competition. That would reduce the probing effect and force competitors to be more scientifically constructive in their solution. When evaluation is expensive, the competitor will spend them more wisely.

