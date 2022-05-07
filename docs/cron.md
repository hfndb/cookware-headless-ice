# Cron tasks

Back to [main page](../README.md).

Executing cron tasks is integrated as a kind of [proof of concept](https://en.wikipedia.org/wiki/Proof_of_concept). Of the various ways such tasks can be organized. That's all.

First: In Unix and Linux environments, a **system** known as [cron](https://en.wikipedia.org/wiki/Cron) is there to automatically trigger tasks to perform.

Interestingly, according to a **dictionary**, [cron](https://en.wiktionary.org/wiki/cron#Etymology) is not only a word for **organizing**, also for **crime**. Organizing is considered a crime? 😀 Perhaps if others are harassed by organizing.

As a matter of **ethics**: If you don't want to be harassed by others, then also don't harass others if not necessary. How then would you define 'necessary'?

## Looking back

For another project, [cookware-texts](https://github.com/hfndb/cookware-texts), I made a generic file - [generic/cron.mjs](../src/generic/cron.mjs). That program, project needs to be triggered by system cron, for example to cleanup temp files and to merge [Notes](https://github.com/hfndb/tools/tree/master/programs/notes). At application level, such a situation can be used for various tasks.

For another situation, I made a tiny program, [Notifications](https://github.com/hfndb/tools/tree/master/programs/notifications). To show notifications in the system tray of a [KDE](https://en.wikipedia.org/wiki/KDE) desktop ([Kubuntu Linux](https://kubuntu.org/])), though that facility can also trigger [Gnome](https://en.wikipedia.org/wiki/GNOME) etc notifications.

In this project, cookware-headless-ice, I already added a project overview, code statistics of a project.

## Looking now

These projects combined, I thought it would be nice to also include this generic cron.mjs in this project. To make that available as Open Source and to show how that can be used - to for example automatically generate a project overview and to show system notifications.

For that reason, I also added the file [local/cron.mjs](../src/local/cron.mjs). Just to show that there are many ways to arrive at some end goal. Such as programs like system cron, application cron etc.
