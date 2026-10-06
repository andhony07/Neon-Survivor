<div align="center">

```
 ███╗   ██╗███████╗ ██████╗ ███╗   ██╗
 ████╗  ██║██╔════╝██╔═══██╗████╗  ██║
 ██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║
 ██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║
 ██║ ╚████║███████╗╚██████╔╝██║ ╚████║
 ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
   S U R V I V O R  //  A R E N A  0 1
```

### Move. Aim. Shoot. Level up. Survive the Overlord.

![HTML5](https://img.shields.io/badge/HTML5-Canvas-00f0ff?style=for-the-badge&logo=html5&logoColor=white&labelColor=0a0d1c)
![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-ffd166?style=for-the-badge&logo=javascript&logoColor=black&labelColor=0a0d1c)
![Dependencies](https://img.shields.io/badge/Dependencies-0-ff2bd6?style=for-the-badge&labelColor=0a0d1c)
![Genre](https://img.shields.io/badge/Genre-Survivor%20Shooter-ff4d6d?style=for-the-badge&labelColor=0a0d1c)

**[▶ PLAY NOW](https://andhony07.github.io/neon-survivor/)**

</div>

---

## 🎮 THE MISSION

You are alone in a neon arena. Enemies spawn nonstop and hunt you down. Shoot them, grab the XP gems they drop, and level up. Every level pauses the game and offers three upgrades, so every run builds a different monster. Every 5 waves the **OVERLORD** arrives.

How long can you last?

## 🕹️ CONTROLS

| Action | Key |
| :-- | :-- |
| 🏃 **Move** | `←` `↑` `↓` `→` (WASD also works) |
| 🎯 **Aim** | Mouse / touchpad |
| 🔫 **Shoot** | Hold `Z` (left click also works) |
| 💨 **Dash** (invulnerable) | `Space` |
| 💥 **Nova blast** | `E` |
| ⏸️ **Pause** | `P` |

## 👾 ENEMIES

| Enemy | Speed | HP | Danger |
| :-- | :-: | :-: | :-- |
| 🔴 **Crawler** | Fast | Low | Rushes you in numbers |
| 🟢 **Swarm** | Very fast | Tiny | Arrives in packs of 8 |
| 🟣 **Shooter** | Medium | Low | Keeps its distance and fires |
| 🟠 **Brute** | Slow | High | Heavy contact damage |
| 🔵 **Tank** | Very slow | Massive | An unstoppable wall |
| ☠️ **Overlord** | Boss | Huge | See below |

## ☠️ BOSS: THE OVERLORD

Appears every **5 waves**. It gets stronger each time and changes tactics as you hurt it.

| Phase | Trigger | New behavior |
| :-: | :-: | :-- |
| **1** | 100% HP | Radial bullet bursts |
| **2** | below 75% | Aimed triple shots |
| **3** | below 50% | Summons crawlers, orbits the arena |
| **4** | below 25% | Spiral bullet storm, faster attacks |

Beat it and the run keeps going. There is no ending, only harder waves.

## ⚡ UPGRADES

Pick 1 of 3 random cards at every level-up.

| Upgrade | Effect |
| :-- | :-- |
| ⚡ **Rapid Fire** | +25% fire rate |
| 💥 **Heavy Rounds** | +40% damage |
| 🧲 **Magnet** | +50% XP pickup radius |
| ❤️ **Reinforced Armor** | +30 max HP and heal 30 |
| 🔥 **Explosive Ammo** | Bullets explode on impact (stacks) |
| 👻 **Dash Master** | -25% dash cooldown |
| 💨 **Speed Boost** | +15% movement speed |
| 🎯 **Multishot** | Chance to fire an extra bullet (stacks) |

## 🚀 HOW TO RUN

```bash
git clone https://github.com/andhony07/neon-survivor.git
cd neon-survivor
```

Then open `index.html` in any modern browser. No install, no build step, no server.

## 🗂️ PROJECT FILES

```
neon-survivor/
├── index.html   menus and canvas
├── style.css    neon UI styling
├── game.js      game loop, enemies, boss, upgrades, rendering
└── assets/      reserved for sounds and sprites
```

## 🛠️ UNDER THE HOOD

- `requestAnimationFrame` loop with delta time, so speed is independent of FPS
- Fixed 1600×1000 arena scaled to any window size
- Pure Canvas drawing: no images, no libraries
- Particles, hit flashes, knockback and screen shake for game feel

## 🗺️ ROADMAP

- [ ] 🔊 Sound effects and music
- [ ] 🧬 Weapon evolution
- [ ] 👑 Elite enemies
- [ ] 🎁 Boss drops
- [ ] 🧑‍🚀 Multiple characters
- [ ] 🌳 Skill tree
- [ ] 🏆 Local high score

---

<div align="center">

**Made by [Andhony Saviyar S](https://github.com/andhony07)**

If you survived past wave 10, you're good. ⭐ the repo!

</div>
