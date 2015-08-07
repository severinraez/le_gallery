<?php
require_once 'lib/HamlPHP/HamlPHP.php';
require_once 'lib/HamlPHP/Storage/FileStorage.php';

// Make sure that a directory _tmp_ exists in your application and it is writable.
$parser = new HamlPHP(new FileStorage(dirname(__FILE__) . '/tmp/'));

$content = $parser->parseFile('views/index.haml');

echo $parser->evaluate($content, array('foo' => '1'));