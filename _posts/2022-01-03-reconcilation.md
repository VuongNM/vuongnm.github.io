---
layout: post
title: Match Your Forecast With Your Plan, Bayesian Style.
excerpt: Manage your inventory with science, find out now!
---



The COVID pandemic is inching to an end, but its effects on global economics is still a painful ache. Retailers across the globe (checkmate flat earther!) are having a seizure looking at their drop dead sale timeseries. Something looking like this:


![image](/images/dead.png ){: width="200" }







Okay may be not like that, but more like this:

![image](/images/pandemic_sale.png )
<center><em>Merchandise spending declines in the US, credit to World Economic Center.</em></center>






At one retailer named Everything On Sale, there goes the conversation:



Alice: Now the problem for us the retailer is that how do we adjust the financial outlook to this new timeline, and how do we adjust our inventory outlook to match the amount of money we have ?

Bob: Cut every product down, say, 60% of units ?

Alice: Good point, but how do we handle the products with only 1 unit in the forecast (Or anything is not an integer, for that matter) ?


Bob: Okay we have plenty of skus, let's drop some and keep some.

Alice: Clever, we can choose which one to keep based on their sale number. Let's keep the one with the higher sale!

Bob: Perfect! But the question still remains: how do we make it match the plan of selling 234 units, coming from Chad at finance ?

Alice: How about giving each product an equal fraction of the total sale ?

Bob: Does not work, our sales don't look like that. See, diapers sell a lot more units than Mama Recreational Massage Device! We will end up with an empty stock of diapers and a lot of unsold MRMD...





And then gospel music plays, descending Deacon, a fanatic from the church of Bayesian, across the street. Deacon said:

Hear me children! You can randomly sample units, based on the sale ratio of each product. 

The prophecy struct their ears. Bob and Alice exploded. They are in awe, asking Deacon for the sauce. 



Deacon draws on the board the mathematical squiggles, dazzles Alice and Bob. The board is full of drawings like worms on sand (integrals and such), characters that do not constitute any word, very strange to Bob and Alice. However, they still believe.


The church of Bayesian, unlike other churches, has their beliefs in working order with their theories. That's why it's spreading faster than Toronto sewage steam on a cold day. 




![image](/images/toronto_wake_up.jpg )
<center><em>Toronto this morning, nicer when you don't see the sewage system.</em></center>





Vincent, as a practical Bayesian bible reader, [translates](mailto:vuongnguyen710@gmail.com) the squiggles into Bob and Alice language of the big squiggling animal (Python). And then he took Bob and Alice out to lunch and then more about his prior belief.



End of story!






Okay, here are more technical details of the method. Let's say that we have an assortment of N products. Each with a certain forecast of sales next month. The problem is how do we take those forecasts and adjust it to match an exact grand total number. 

We can do this by resample the sale, taking in normalized sales as sampling probabilities. This constitutes a Dirichlet distribution probabilities. We will draw random samples from this distribution until we reach our goal. It could be used to rescale the sale total higher or lower than the original total forecast. 

Anecdote: The distribution could have any shape, but real world evidence suggests that sales usually concentrated in a small number of products, and little distributed to others. But your shape of distribution may vary. However, the algorithm works the same. 



The theoretical background for this method is as follows:
- __We assume sales across the assortment is a Dirichlet distribution D(V)__, where V is a vector of size N, each element of V is the number of sales for each product. Generally, Dirichlet prior used a vector of ones as a weak prior. We can choose an even weaker prior like a vector of 1/2 (Jeffrey) or zeros (Haldane prior). 

- __The sample likelihood is a Categorical distribution__ 

- __The posterior is a Dirichlet D(V')__ , as a consequence of conjugation with the Categorical likelihood. The elements in vector V' is now the sale of each product after scaling.


I've tested this method against others like in the goofy conversation above. Evidence so far shows that it produces a new distribution closest to the original, based on Kullback-Leibner divergence. However, I don't have any formal proof for it yet. The theoretical question is still: How do we find a distribution of sale that is the most similar to another, subject to a constraint. In this case, the constraint is that the total sale has to match a certain number.



The choice of priors for the Dirichlet is quite interesting. In practice, many products have zero for its original distribution (the forecast). And by that, it will not be resampled by the method. Adding 1 to each number (of the forecast, or the vector V) gives it a little chance to show up in the sampling process. This is equal to the Uniform prior, or Dirichlet (1).









