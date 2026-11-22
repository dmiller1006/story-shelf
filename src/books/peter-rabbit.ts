import type { Book } from './types';

// Text and illustrations: Beatrix Potter, 1902 (public domain).
// Transcribed and scanned by Project Gutenberg volunteers, eBook #14838.
export const peterRabbit: Book = {
  id: 'peter-rabbit',
  title: 'The Tale of Peter Rabbit',
  author: 'Beatrix Potter',
  year: 1902,
  cover: 'peter19.jpg',
  coverAlt: 'Peter Rabbit in his blue jacket squeezing under the garden gate.',
  coverColor: '#7a9cc6',
  coverMood: 'cozy',
  credit: 'Story and pictures by Beatrix Potter, 1902. Public domain. Digitized by Project Gutenberg volunteers.',
  pages: [
    {
      image: 'peter02.gif',
      alt: 'A drawing of a little rabbit sitting up and looking straight at you.',
      text: [
        'Once upon a time there were four little Rabbits, and their names were—',
        'Flopsy,\nMopsy,\nCotton-tail,\nand Peter.',
      ],
      mood: 'cozy',
    },
    {
      image: 'peter08.jpg',
      alt: 'Four little rabbits and their mother at home under the roots of a big fir tree.',
      text: ['They lived with their Mother in a sand-bank, underneath the root of a very big fir-tree.'],
      mood: 'cozy',
    },
    {
      image: 'peter11.jpg',
      alt: 'Mrs. Rabbit in her apron with Flopsy, Mopsy, and Cotton-tail in red cloaks. Peter stands to one side in his blue jacket.',
      text: [
        "'Now my dears,' said old Mrs. Rabbit one morning, 'you may go into the fields or down the lane, but don't go into Mr. McGregor's garden: your Father had an accident there; he was put in a pie by Mrs. McGregor.'",
      ],
      mood: 'cozy',
    },
    {
      image: 'peter12.jpg',
      alt: 'Mrs. Rabbit buttons up Peter’s blue jacket while his sisters wait in their red cloaks.',
      text: ["'Now run along, and don't get into mischief. I am going out.'"],
      mood: 'cozy',
    },
    {
      image: 'peter15.jpg',
      alt: 'Mrs. Rabbit walks through the wood with a basket and an umbrella.',
      text: [
        "Then old Mrs. Rabbit took a basket and her umbrella, and went through the wood to the baker's. She bought a loaf of brown bread and five currant buns.",
      ],
      mood: 'playful',
    },
    {
      image: 'peter16.jpg',
      alt: 'Flopsy, Mopsy, and Cotton-tail picking blackberries.',
      text: ['Flopsy, Mopsy, and Cotton-tail, who were good little bunnies, went down the lane to gather blackberries:'],
      mood: 'playful',
    },
    {
      image: 'peter19.jpg',
      alt: 'Peter in his blue jacket squeezing under the garden gate.',
      text: ["But Peter, who was very naughty, ran straight away to Mr. McGregor's garden, and squeezed under the gate!"],
      mood: 'sneaky',
    },
    {
      image: 'peter20.jpg',
      alt: 'Peter munching a radish while a robin watches from the top of a spade.',
      text: ['First he ate some lettuces and some French beans; and then he ate some radishes;'],
      mood: 'sneaky',
      sfx: 'munch',
    },
    {
      image: 'peter23.jpg',
      alt: 'Peter holding his tummy, looking a little sick, while a robin watches.',
      text: ['And then, feeling rather sick, he went to look for some parsley.'],
      mood: 'sneaky',
    },
    {
      image: 'peter24.jpg',
      alt: 'Peter comes around a cucumber frame and finds Mr. McGregor planting cabbages.',
      text: ['But round the end of a cucumber frame, whom should he meet but Mr. McGregor!'],
      mood: 'sneaky',
      sting: 'surprise',
    },
    {
      image: 'peter27.jpg',
      alt: 'Mr. McGregor running after Peter, waving a rake.',
      text: [
        "Mr. McGregor was on his hands and knees planting out young cabbages, but he jumped up and ran after Peter, waving a rake and calling out, 'Stop thief!'",
      ],
      mood: 'chase',
    },
    {
      image: 'peter28.jpg',
      alt: 'One of Peter’s little shoes lying among the cabbages, with a robin beside it.',
      text: [
        'Peter was most dreadfully frightened; he rushed all over the garden, for he had forgotten the way back to the gate.',
        'He lost one of his shoes among the cabbages, and the other shoe amongst the potatoes.',
      ],
      mood: 'chase',
    },
    {
      image: 'peter31.jpg',
      alt: 'Peter stuck in a gooseberry net by the buttons of his jacket.',
      text: [
        'After losing them, he ran on four legs and went faster, so that I think he might have got away altogether if he had not unfortunately run into a gooseberry net, and got caught by the large buttons on his jacket. It was a blue jacket with brass buttons, quite new.',
      ],
      mood: 'chase',
    },
    {
      image: 'peter32.jpg',
      alt: 'Three sparrows fly down to Peter, who is crying in the net.',
      text: [
        'Peter gave himself up for lost, and shed big tears; but his sobs were overheard by some friendly sparrows, who flew to him in great excitement, and implored him to exert himself.',
      ],
      mood: 'sad',
      sfx: 'chirp',
    },
    {
      image: 'peter35.jpg',
      alt: 'Mr. McGregor bringing down a sieve while Peter wriggles out of his jacket.',
      text: [
        'Mr. McGregor came up with a sieve, which he intended to pop upon the top of Peter; but Peter wriggled out just in time, leaving his jacket behind him.',
      ],
      mood: 'chase',
    },
    {
      image: 'peter36.jpg',
      alt: 'Peter hiding in a watering can in the tool-shed.',
      text: [
        'And rushed into the tool-shed, and jumped into a can. It would have been a beautiful thing to hide in, if it had not had so much water in it.',
      ],
      mood: 'sneaky',
      sfx: 'splash',
    },
    {
      image: 'peter39.jpg',
      alt: 'Mr. McGregor lifting flower-pots to look for Peter.',
      text: [
        'Mr. McGregor was quite sure that Peter was somewhere in the tool-shed, perhaps hidden underneath a flower-pot. He began to turn them over carefully, looking under each.',
        "Presently Peter sneezed—'Kertyschoo!' Mr. McGregor was after him in no time.",
      ],
      mood: 'sneaky',
      sfx: 'sneeze',
    },
    {
      image: 'peter40.jpg',
      alt: 'Peter leaping out of the shed window, knocking over the plant pots, as Mr. McGregor’s boot stamps down behind him.',
      text: [
        'And tried to put his foot upon Peter, who jumped out of a window, upsetting three plants. The window was too small for Mr. McGregor, and he was tired of running after Peter. He went back to his work.',
      ],
      mood: 'chase',
      sfx: 'crash',
    },
    {
      image: 'peter43.jpg',
      alt: 'Peter sitting alone, out of breath, looking around the garden.',
      text: [
        'Peter sat down to rest; he was out of breath and trembling with fright, and he had not the least idea which way to go. Also he was very damp with sitting in that can.',
        'After a time he began to wander about, going lippity—lippity—not very fast, and looking all round.',
      ],
      mood: 'sad',
    },
    {
      image: 'peter44.jpg',
      alt: 'Peter crying at a locked door in a wall, with a little mouse on the doorstep.',
      text: [
        'He found a door in a wall; but it was locked, and there was no room for a fat little rabbit to squeeze underneath.',
        'An old mouse was running in and out over the stone doorstep, carrying peas and beans to her family in the wood. Peter asked her the way to the gate, but she had such a large pea in her mouth that she could not answer. She only shook her head at him. Peter began to cry.',
      ],
      mood: 'sad',
    },
    {
      image: 'peter47.jpg',
      alt: 'A white cat sitting very still by a pond, watching goldfish. Peter peeks from far away.',
      text: [
        'Then he tried to find his way straight across the garden, but he became more and more puzzled. Presently, he came to a pond where Mr. McGregor filled his water-cans. A white cat was staring at some gold-fish, she sat very, very still, but now and then the tip of her tail twitched as if it were alive. Peter thought it best to go away without speaking to her; he had heard about cats from his cousin, little Benjamin Bunny.',
      ],
      mood: 'sneaky',
    },
    {
      image: 'peter48.jpg',
      alt: 'Peter peeking over a wheelbarrow at Mr. McGregor hoeing onions.',
      text: [
        'He went back towards the tool-shed, but suddenly, quite close to him, he heard the noise of a hoe—scr-r-ritch, scratch, scratch, scritch. Peter scuttered underneath the bushes. But presently, as nothing happened, he came out, and climbed upon a wheelbarrow and peeped over. The first thing he saw was Mr. McGregor hoeing onions. His back was turned towards Peter, and beyond him was the gate!',
      ],
      mood: 'sneaky',
      sfx: 'scratch',
    },
    {
      image: 'peter51.jpg',
      alt: 'Peter slipping under the garden gate to safety.',
      text: [
        'Peter got down very quietly off the wheelbarrow; and started running as fast as he could go, along a straight walk behind some black-currant bushes.',
        'Mr. McGregor caught sight of him at the corner, but Peter did not care. He slipped underneath the gate, and was safe at last in the wood outside the garden.',
      ],
      mood: 'chase',
    },
    {
      image: 'peter52.jpg',
      alt: 'A scarecrow wearing Peter’s little blue jacket and shoes.',
      text: [
        'Mr. McGregor hung up the little jacket and the shoes for a scare-crow to frighten the blackbirds.',
        'Peter never stopped running or looked behind him till he got home to the big fir-tree.',
      ],
      mood: 'playful',
    },
    {
      image: 'peter55.jpg',
      alt: 'Peter flopped on the floor of the rabbit-hole while his mother cooks.',
      text: [
        'He was so tired that he flopped down upon the nice soft sand on the floor of the rabbit-hole and shut his eyes. His mother was busy cooking; she wondered what he had done with his clothes. It was the second little jacket and pair of shoes that Peter had lost in a fortnight!',
      ],
      mood: 'cozy',
    },
    {
      image: 'peter57.jpg',
      alt: 'Mrs. Rabbit making camomile tea by the fire while the little rabbits watch.',
      text: [
        'I am sorry to say that Peter was not very well during the evening.',
        'His mother put him to bed, and made some camomile tea; and she gave a dose of it to Peter!',
        "'One table-spoonful to be taken at bed-time.'",
      ],
      mood: 'sleepy',
    },
    {
      image: 'peter58.jpg',
      alt: 'Flopsy, Mopsy, and Cotton-tail eating bread and milk and blackberries.',
      text: ['But Flopsy, Mopsy, and Cotton-tail had bread and milk and blackberries for supper.'],
      mood: 'sleepy',
    },
  ],
};
