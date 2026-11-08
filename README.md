# Réseau

Ta connexion en un coup d'œil : un test qui mesure ta box, Internet, le DNS et les serveurs de League of Legends (EUW) et dit d'où vient le problème s'il y en a un, et la liste des réseaux Wi-Fi enregistrés sur ton PC avec leur mot de passe.

*English version: [README.en.md](README.en.md)*

## Tester ma connexion

Le test dure une quinzaine de secondes. Il mesure :

- **Ta box** : le ping vers ta box (le premier routeur sur le chemin), sur 8 essais ;
- **Internet** : le ping vers un serveur public (1.1.1.1), sur 8 essais ;
- **LoL · EUW** : le ping vers l'entrée du réseau de Riot Games en Europe de l'Ouest, sur 12 essais ;
- **DNS** : le temps pour trouver l'adresse d'un site.

Pour chacun : ping moyen, minimum et maximum, **gigue** (la variation d'un essai à l'autre) et **pertes** (les essais sans réponse).

Une phrase résume ensuite la situation : tout va bien, ta box répond mal (câble ou Wi-Fi de ce PC), la box répond mais pas Internet (box ou opérateur), Internet marche mais pas le DNS (les sites ne s'ouvriront pas), connexion instable vers LoL (lag à prévoir), ou Wi-Fi lent entre le PC et la box (un câble ferait mieux).

Les serveurs de jeu de Riot ne répondent pas au ping : Réseau mesure le premier routeur de Riot, juste avant eux. Le vrai ping en partie est quelques millisecondes plus haut.

## Wi-Fi enregistrés

La liste des réseaux Wi-Fi que ton PC connaît, avec leur type de sécurité.

- **Afficher** : lit et montre le mot de passe du réseau. Il n'est lu qu'à ce moment-là.
- **Copier** : copie le mot de passe dans le presse-papiers.
- **Masquer** : le cache à nouveau.

Pratique pour connecter un téléphone ou un autre PC au même Wi-Fi.

## Autorisation

Le plugin a besoin de l'autorisation **volet système** pour lancer les mesures et lire les réseaux Wi-Fi de Windows ; sans elle, il le signale et indique où l'accorder (Autorisations).

## Données et synchronisation

Rien n'est synchronisé et rien n'est gardé : les mesures et les mots de passe sont lus sur ton PC au moment où tu les demandes.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Réseau → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
