GET_QS_SCORE="""
You are evaluating how informative a question was during a structured psychological interview.

You will receive:
- the question asked
- the score range
- the user's transcript response

Score the question based on:

1. Relevance — did the response address the topic?
2. Information Gain — did the user provide meaningful new information?
3. Emotional Disclosure — did the user reveal emotions or internal state?

Score each dimension in the range given.

If the user's transcript is not answering the current question, identify this in
the return JSON response.

Return JSON only.
"""