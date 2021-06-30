## Using Drupal to manage a website

The Open Source [content management system](https://en.wikipedia.org/wiki/Content_management_system) (CMS) [Drupal](https://en.wikipedia.org/wiki/Drupal) is written in PHP.

If you are using cookware-headless-ice to produce a socalled 'static website', a provider of [tiny budget hosting](../tiny-budget-hosting.md) will probably offer you a standard installation of Drupal. You can then install Drupal using a control panel like [CPanel](https://en.wikipedia.org/wiki/CPanel).

To prepare making a static website suitable to use in Drupal, this cookware-headless-ice includes a bash script. See [tools/cms/drupal/manage-dev.sh](../../tools/cms/drupal/manage-dev.sh). You only need to copy the related env-sample.sh script to env.sh and tweak environment variables yourself.

This script manages a local development environment to run a local Drupal server using a tiny [SQLite](https://en.wikipedia.org/wiki/SQLite) database. Such an environment is only intended to convert pages templates and so forth to what in Drupal is known as a [theme](https://www.drupal.org/docs/theming-drupal). Points of attention:

+ A HTML base template becomes a base theme in Drupal
+ Template inheritance is in Drupal organized by [sub themes](https://www.drupal.org/docs/theming-drupal/creating-sub-themes).
+ Choice of a template for specific pages or users can be organized with plugin modules like [switch page theme](https://www.drupal.org/project/switch_page_theme).
