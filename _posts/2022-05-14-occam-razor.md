---
layout: post
title: Occam's razor, machine learning version
excerpt: tldr same errors? Choose the one with higher bias.

---


## Grandma's wisdom

Model selection is hard. Model selection when all you do is to treat a ML model as a blackbox is very hard. And fucking dangerous. If you do it, then you are on a treadmill of never ending horror. One day your model will fail, this is a certainty. And you do not know why. 

You either pray that your model is unimportant that you amongst all people, let it slide. Or you cook up some new blackbox model and hope it solves the problem this time. Or you can lie. Tuning the random seed is accepted and upvoted these days in Kaggle. Gold medal and such, what lying are you talking of ? 


This blackbox mindset is particularly dangerous, because it clouds the way to the solution. On the other hand, if you think of your model as a deterministic algorithm, which it is (Data is code and code is data, more on that later). You will know that there are solutions for each kind of problem. And you know how far your solution can lead you.



Now let me tell you a story when this matters.


I was working on a forecasting project, and dealing with a guy named Tony. Tony is the head of merchandising. This chad is the human version of a forecasting system, runs on carbohydrates. He has years of experience working with forecasting.

He does everything in Excel. His excel file is an ecosystem in itself. He can smell a number and tell it's over or under forecast right off his nose. It's fucking special. Tony's knowledge is something I called grandma wisdom (Taleb's words). He just knows. He does not need any fAnCy formular to explain it. And he single handedly holds the previous version of the forecast engine inplace. Now the problem is we only have one Tony and a quarter millions of products. There is so much he can go through. 


![image](/images/chad.jpg)
<center> <em>Tony the Chad, Bearer of Grandma wisdom.</em> </center>






My forecast system flows into Tony's plans. And Tony will be, rightfully, the final boss that my forecast has to battle before getting to the release. He would slice the forecast in some magical way, and wham! weird shit shows up. You hate him for breaking the illusion of grandeur of your mighty model, but have to give respect to his critics, as almost always, he is right. 

I need to make many changes in the system that I build the forecast in.  Oh, have I told you about the time constraint? This forecast has to be available in a span of 3 hours. After the data is sync, and before Tony shows up on the 1st day of each month. 


From a simple boosted trees model, It turns into a monster ensemble that cannot be trained in a single machine. Many parts of the original idea have to be replaced. At the end of it, many bits of Tony wisdom is infused in the model in one way or the other. Either it's a slice and dice sub-sampling, or design of evaluation scheme. 

Now, give you 2 models of the same MAPE error, one with Tony's pill and other without. Which one would you choose and why ?


![image](/images/pills.jpg)


More daunting question: would a model treated as blackbox and trained by random param search pass Tony the chad ? Probably not! Quite frankly, I fear doing it that way.


Let me convince you with something more scientific.


## Pythagoras equation of machine learning


Let say you have a regression problem, you pick an estimator of choice. Then you got the Pythagoras theorem for your estimator:

	` Mean Squared error = Bias**2 + Variance `

	
Your model error can always come from 2 sources: bias and variance. When you reduce the bias, the variance will increase and vice versa. This is a trade off. This tradeoff leads to the problem of model selection.


In ML pop culture, people say choose the one model which is simpler (given the same error), but rarely elaborate what simpler means. So what ppl usually take out of that is about choosing simpler algorithms. Then throws a fit when the results are worse. Fuck off I want my trees, right ?

Generally, simpler models tend to have less bias. Not always, but most. But a less biased model is not always simpler. Given the forecast model I built for Tony, it's sure as hell not simpler. But it is certainly more biased. I contort the model to make it behave in a certain, predictable way. I introduce biases in my model.


Another example: In a Bayesian setting, one can introduce bias into a model by introducing hierarchical structure, or impose constraints on the parameter space. The latter is usually well understood in ML literature, but the former is not, let alone practiced. With better structure, one can even afford a model having more parameters than training samples.


And among models of similar performance, it's the one with higher bias that we want. We can manipulate them far more easily. We can introduce bias in the algorithm we choose, the constraints in the parameter space, or from the structure in the training and validation procedure. This infused bias is the control over the model. It's Tony's Grandma wisdom. This should be your Occam razors when doing model selection. 

