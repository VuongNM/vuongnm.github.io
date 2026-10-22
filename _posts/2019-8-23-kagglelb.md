---
layout: post
title: On kaggle public - private leaderboard
excerpt: Kaggle's public leaderboard is either redundant or a leak. Here's why, and what I'd do instead.
---

On Kaggle, you see your score on a public leaderboard during the competition, and the final ranking comes from a private one at the end. I think the public leaderboard does more harm than good. To see why, start with what a test set is for.

## What train and test sets are for

The point of a machine learning model is to predict the future. The future is unknown, so we simulate it: we collect data that is as informative as possible and build the model we think is best.

The **trainset** should hold everything the model (and you) should know about the data: the feature types and the distribution you can observe. How big and how complete it needs to be depends on the task and on how much the model has to generalize.

The **testset**, as the name says, tests the model. What it tests depends on the setting:

- Can the model extrapolate from a partial trainset into the unknown? On Kaggle, almost always yes.
- How fast does it run, and how easy is it to deploy? On Kaggle, usually no. In the real world, yes.

Because the testset stands in for the unknown, every time you evaluate against it, it gets a little less useful as a test.

The same goes for your validation set. If you deliberately make it look like the testset, you undermine the testset and the whole exercise. How do you make something look like a thing you don't know? You're not supposed to know the test set.

## Why the public leaderboard isn't that useful

The train and test sets are usually split at random, or by some index like time or location. The public leaderboard sits somewhere in between, and that's the problem:

- If the public test data looks like the trainset, it's redundant.
- If it reveals something about the private test data, it's a leak. It undermines the whole point of having unseen data. (Whether that leak is acceptable is the organizer's call.)
- If it looks like neither, you get big shakeups at the end and a lot of disappointed people.

On top of that, a leaderboard you can probe for free rewards trial and error. I agree it works. But it discourages rigorous, well thought out approaches.

## What I'd do instead

Get rid of the public leaderboard altogether. All you get, folks, is the trainset. That puts the responsibility on the organizer to build a train and test set that make sense.

It would also take away some of the thrill: the feeling of competing, and the self-gratification of beating other teams.

A middle ground is round-based evaluation, say, once a week. That cuts down the probing and pushes competitors toward more scientific solutions. When evaluations are expensive, people spend them more wisely.
