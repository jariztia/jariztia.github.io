# Guess Image Game

Small game using AWS framework

## Game Logic

### Game Setup
1. A user creates a game and gets a (gameId)
2. Other users can join using that gameId
3. Five random images are assigned to each player

### Each round
4. The first player selects one of his images and writes a word or a phrase to describe it (hint), not too obvious, not too vague
5. The hint is displayed to all players
6. The rest of the players select one of their images they think matches the hint
7. All selected images including the first player's image are displayed in a random order to all the players
8. All players except the one who wrote the hint select the image they guess that the first player choose
9. Points are given to the players.
10. All players get an additional random image.

### Points

#### Hint Writer:
- **0 points**: No one selected his image
- **0 points**: Everyone selected his image
- **3 points**: At least 1, but not everyone, selected his image

#### Players:
- **3 points**: If selected the hint writer image
- **+1 point**: One additional point for every vote the image that the player selected

## Contribute

Help me translate the rules, add a new language in the constants file and create a PR.

## License

This project is licensed under the terms of the Apache Version 2.0 License.