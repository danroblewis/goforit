% Simple family relationships
parent(john, bob).
parent(john, lisa).
parent(mary, bob).
parent(mary, lisa).
parent(bob, ann).
parent(lisa, sam).

% Rules
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

% Query to find grandparents
:- grandparent(X, sam), write('Grandparent of Sam: '), write(X), nl, fail.
:- halt.
