---
layout: post
title: Match your forecast with your plan, bayesian style
excerpt: Manage your inventory with science, find out now!
---

Your forecast says one thing, and finance's plan says a smaller number. How do you shrink a forecast for hundreds of products so it adds up to exactly the plan, without wrecking it? Here's a simple Bayesian way, told as a story first and then with the details.

## The story

The COVID pandemic is inching to an end, but its effects on the global economy are still a painful ache. Retailers across the globe (checkmate, flat earthers!) are having a seizure looking at their drop-dead sales timeseries. Something like this:

![image](/images/dead.png ){: width="200" }

Okay, maybe not like that, but more like this:

![image](/images/pandemic_sale.png )
<center><em>Merchandise spending declines in the US during Covid, credit to World Economic Center.</em></center>

At a retailer called Everything On Sale, the conversation goes like this:

Alice: Here's our problem. How do we adjust our financial outlook to this new reality, and how do we cut our inventory to match the money we actually have?

Bob: Cut every product down to, say, 60% of its units?

Alice: Good point, but what about products with only 1 unit in the forecast? Or anything that doesn't come out as a whole number, for that matter?

Bob: Okay, we have plenty of SKUs. Let's drop some and keep some.

Alice: Clever. We can choose which ones to keep by their sales. Let's keep the ones that sell more!

Bob: Perfect! But it still has to add up to the plan: 234 units, from Chad in finance.

Alice: How about giving every product an equal share of the total?

Bob: Doesn't work, our sales don't look like that. Diapers sell way more units than the Mama Recreational Massage Device! We'd run out of diapers and sit on a pile of unsold MRMDs...

And then gospel music plays, and down comes Deacon, a fanatic from the church of Bayesian across the street. Deacon says:

Hear me, children! Randomly sample your units, based on each product's share of sales.

The prophecy strikes their ears. Bob and Alice are in awe, and ask Deacon for the sauce.

Deacon covers the board in mathematical squiggles that look like worms on sand (integrals and such), symbols that don't spell any word Bob and Alice know. They believe anyway.

Unlike other churches, the church of Bayesian has beliefs that actually work in practice. That's why it's spreading faster than Toronto sewage steam on a cold day.

![image](/images/toronto_wake_up.jpg )
<center><em>Toronto this morning, nicer when you don't see the sewage system.</em></center>

Vincent, a practical reader of the Bayesian bible, [translates](mailto:vuongnguyen710@gmail.com) the squiggles into the language of the big squiggly animal (Python) for Bob and Alice. Then he takes them out to lunch and tells them more about his prior beliefs.

End of story!

## The method

Say you have N products, each with a sales forecast for next month, and you need the forecasts to add up to an exact total. How do you split that total between the products?

1. Turn each product's forecast into a share: its forecast divided by the sum of all forecasts.
2. Treat those shares as the probabilities of a Categorical distribution.
3. Draw units from that distribution, one at a time, until you reach the total.
4. Count how many units each product got. That's the new forecast.

Products that sell a lot get most of the units, products that sell a little get a few, and the result always adds up to the plan, in whole units. The shape of your sales doesn't matter. Often a few products take most of the sales and the rest get crumbs, but your shape may differ, and the algorithm works the same.

## Why it works

Behind the method is this model of how the data is generated:

- __Each product's share of sales follows a Dirichlet distribution D(V)__, where V is a vector of size N holding the sales of each product. The usual weak prior is a vector of ones. You can go weaker with a vector of 1/2 (the Jeffreys prior) or zeros (the Haldane prior).
- __The likelihood is Categorical__: each unit sold goes to one product.
- __The posterior is again a Dirichlet, D(V')__, because the Dirichlet is conjugate to the Categorical. The elements of V' are the sales of each product after scaling.

The choice of prior matters more than you'd think. In practice, many products have a forecast of zero, so they never get sampled. Adding 1 to every forecast (to every element of V) gives them a small chance to show up. That's the same as using a uniform prior, Dirichlet(__1__).

## How well it works

I tested this against the other ideas from the goofy conversation above. So far, it produces the new distribution closest to the original, measured by Kullback-Leibler divergence. I don't have a formal proof yet. The open theoretical question is: how do you find the distribution of sales closest to another one, when the total has to match a fixed number?
